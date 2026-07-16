from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterCompanyRequest,
    ResetPasswordRequest,
)
from ..security import get_current_user, request_meta
from ..serializers import serialize_company, serialize_user
from ..services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterCompanyRequest, request: Request, db: Session = Depends(get_db)):
    meta = request_meta(request)
    company, user = auth_service.register(db, payload, meta["ip_address"], meta["user_agent"])
    return {
        "company": serialize_company(company),
        "user": serialize_user(user),
        "message": "Company registered successfully",
    }


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    meta = request_meta(request)
    tokens, user = auth_service.login(db, payload, meta["ip_address"], meta["user_agent"])
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.post("/refresh")
def refresh(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    tokens = auth_service.refresh(db, payload.refresh_token)
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    auth_service.logout(db, payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    meta = request_meta(request)
    message = auth_service.forgot_password(db, payload.email, meta["ip_address"], meta["user_agent"])
    return {"message": message}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    meta = request_meta(request)
    auth_service.reset_password(db, payload, meta["ip_address"], meta["user_agent"])
    return {"message": "Password has been reset successfully. You can now sign in with your new password."}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meta = request_meta(request)
    auth_service.change_password(db, current_user, payload, meta["ip_address"], meta["user_agent"])
    return {"message": "Password changed successfully"}
