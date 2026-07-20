from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import AuditAction, Company, PasswordResetToken, RefreshToken, User, UserRole, UserStatus
from ..schemas import ChangePasswordRequest, LoginRequest, RegisterCompanyRequest, ResetPasswordRequest
from ..security import (
    create_access_token,
    generate_password_reset_token,
    generate_refresh_token,
    hash_password,
    hash_password_reset_token,
    hash_refresh_token,
    password_reset_expiry,
    refresh_expiry,
    verify_password,
)
from .audit import write_audit_log
from .email import send_password_reset_email


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _find_company_by_email_or_name(db: Session, email: str, name: str) -> Company | None:
    normalized_email = _normalize_email(email)
    normalized_name = name.strip().lower()
    return db.scalar(
        select(Company).where(
            (func.lower(Company.email) == normalized_email) | (func.lower(Company.name) == normalized_name)
        )
    )


def _find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == _normalize_email(email)))


def _issue_token_pair(db: Session, user: User) -> dict[str, str]:
    access_token = create_access_token(user)
    raw_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_token),
            expires_at=refresh_expiry(),
        )
    )
    return {"access_token": access_token, "refresh_token": raw_token}


def register(db: Session, payload: RegisterCompanyRequest, ip_address: str | None, user_agent: str | None):
    company_email = _normalize_email(str(payload.company_email))
    owner_email = _normalize_email(str(payload.owner_email))
    company_name = payload.company_name.strip()

    if _find_company_by_email_or_name(db, company_email, company_name):
        raise HTTPException(409, "A company with this name or email is already registered")
    if _find_user_by_email(db, owner_email):
        raise HTTPException(409, "A user with this email already exists")

    company = Company(
        name=company_name,
        industry=payload.industry.strip(),
        email=company_email,
        address=payload.company_address.strip(),
        phone=payload.company_phone.strip(),
    )
    db.add(company)
    db.flush()

    user = User(
        company_id=company.id,
        name=payload.owner_name.strip(),
        email=owner_email,
        password_hash=hash_password(payload.password),
        role=UserRole.COMPANY_ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()

    write_audit_log(db, AuditAction.COMPANY_REGISTERED, company.id, user.id, ip_address, user_agent)
    db.commit()
    db.refresh(company)
    db.refresh(user)
    return company, user


def login(db: Session, payload: LoginRequest, ip_address: str | None, user_agent: str | None):
    email = _normalize_email(str(payload.email))
    user = _find_user_by_email(db, email)

    if not user:
        company = _find_company_by_email_or_name(db, email, "__no_match__")
        if company:
            user = db.scalar(
                select(User).where(
                    User.company_id == company.id,
                    User.role == UserRole.COMPANY_ADMIN,
                    User.status == UserStatus.ACTIVE,
                )
            )

    if not user or not verify_password(payload.password, user.password_hash):
        write_audit_log(
            db,
            AuditAction.LOGIN_FAILED,
            getattr(user, "company_id", None),
            getattr(user, "id", None),
            ip_address,
            user_agent,
        )
        db.commit()
        raise HTTPException(401, "Invalid email or password")

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(403, "Account is not active")

    user.last_login = datetime.now(timezone.utc)
    tokens = _issue_token_pair(db, user)
    write_audit_log(db, AuditAction.USER_LOGIN, user.company_id, user.id, ip_address, user_agent)
    db.commit()
    db.refresh(user)
    return tokens, user


def refresh(db: Session, raw_refresh_token: str) -> dict[str, str]:
    token_hash = hash_refresh_token(raw_refresh_token)
    token = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if not token:
        raise HTTPException(401, "Invalid refresh token")
    if token.revoked:
        db.query(RefreshToken).filter(RefreshToken.user_id == token.user_id, RefreshToken.revoked.is_(False)).update(
            {"revoked": True}
        )
        db.commit()
        raise HTTPException(401, "Refresh token has already been used; all sessions revoked")

    expires_at = token.expires_at if token.expires_at.tzinfo else token.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Refresh token expired")

    user = db.get(User, token.user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(401, "User is not active")

    token.revoked = True
    tokens = _issue_token_pair(db, user)
    db.commit()
    return tokens


def logout(db: Session, raw_refresh_token: str) -> None:
    token_hash = hash_refresh_token(raw_refresh_token)
    token = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if not token:
        raise HTTPException(401, "Invalid refresh token")
    if token.revoked:
        return
    token.revoked = True
    db.commit()


def forgot_password(db: Session, email: str, ip_address: str | None, user_agent: str | None) -> str:
    user = _find_user_by_email(db, email)
    generic_message = "If an account exists for this email, a password reset link has been sent."

    if not user or user.status != UserStatus.ACTIVE:
        return generic_message

    settings = get_settings()
    raw_token = generate_password_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_password_reset_token(raw_token),
            expires_at=password_reset_expiry(),
        )
    )
    write_audit_log(db, AuditAction.PASSWORD_RESET_REQUESTED, user.company_id, user.id, ip_address, user_agent)
    db.commit()

    reset_link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={raw_token}"
    send_password_reset_email(user.email, reset_link, settings.password_reset_token_expire_minutes)

    return generic_message


def reset_password(db: Session, payload: ResetPasswordRequest, ip_address: str | None, user_agent: str | None) -> None:
    token_hash = hash_password_reset_token(payload.token)
    token = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash))

    if not token or token.used:
        raise HTTPException(400, "This password reset link is invalid or has already been used")

    expires_at = token.expires_at if token.expires_at.tzinfo else token.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "This password reset link has expired")

    user = db.get(User, token.user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(400, "This password reset link is no longer valid")

    user.password_hash = hash_password(payload.new_password)
    token.used = True
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False)).update(
        {"revoked": True}
    )
    write_audit_log(db, AuditAction.PASSWORD_RESET_COMPLETED, user.company_id, user.id, ip_address, user_agent)
    db.commit()


def change_password(db: Session, user: User, payload: ChangePasswordRequest, ip_address: str | None, user_agent: str | None) -> None:
    current = db.get(User, user.id)
    if not current or not verify_password(payload.current_password, current.password_hash):
        raise HTTPException(401, "Current password is incorrect")

    current.password_hash = hash_password(payload.new_password)
    db.query(RefreshToken).filter(RefreshToken.user_id == current.id, RefreshToken.revoked.is_(False)).update(
        {"revoked": True}
    )
    write_audit_log(db, AuditAction.PASSWORD_CHANGED, current.company_id, current.id, ip_address, user_agent)
    db.commit()
