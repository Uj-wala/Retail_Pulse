from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import AuditAction, User, UserStatus
from ..schemas import InviteUserRequest, UpdateProfileRequest, UpdateUserRequest
from ..security import hash_password
from .audit import write_audit_log


def list_users(db: Session, company_id: str) -> list[User]:
    return db.scalars(select(User).where(User.company_id == company_id).order_by(User.created_at)).all()


def get_user(db: Session, company_id: str, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user or user.company_id != company_id:
        raise HTTPException(404, "User not found")
    return user


def invite_user(db: Session, company_id: str, invited_by: str, payload: InviteUserRequest) -> User:
    email = payload.email.lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(409, "A user with this email already exists")

    user = User(
        company_id=company_id,
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    write_audit_log(db, AuditAction.USER_INVITED, company_id, invited_by)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, company_id: str, actor_id: str, user_id: str, payload: UpdateUserRequest) -> User:
    user = get_user(db, company_id, user_id)
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.role is not None:
        user.role = payload.role
    if payload.status is not None:
        user.status = payload.status
    write_audit_log(db, AuditAction.USER_UPDATED, company_id, actor_id)
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, company_id: str, actor_id: str, user_id: str) -> User:
    user = get_user(db, company_id, user_id)
    if user.id == actor_id:
        raise HTTPException(400, "You cannot deactivate your own account")
    user.status = UserStatus.INACTIVE
    write_audit_log(db, AuditAction.USER_DEACTIVATED, company_id, actor_id)
    db.commit()
    db.refresh(user)
    return user


def get_profile(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


def update_profile(db: Session, user_id: str, payload: UpdateProfileRequest) -> User:
    user = get_profile(db, user_id)
    if payload.name is not None:
        user.name = payload.name.strip()
    db.commit()
    db.refresh(user)
    return user
