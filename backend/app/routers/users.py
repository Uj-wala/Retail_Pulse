from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import InviteUserRequest, UpdateUserRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_user
from ..services import user as user_service

router = APIRouter(prefix="/users", tags=["Users"])

admin_only = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)


@router.get("")
def list_users(current_user: User = Depends(admin_only), db: Session = Depends(get_db)):
    users = user_service.list_users(db, current_user.company_id)
    return {"users": [serialize_user(user) for user in users], "total": len(users)}


@router.get("/me")
def get_current_user_route(current_user: User = Depends(get_current_user)):
    return {"user": serialize_user(current_user)}


@router.post("", status_code=status.HTTP_201_CREATED)
def invite_user(payload: InviteUserRequest, current_user: User = Depends(admin_only), db: Session = Depends(get_db)):
    user = user_service.invite_user(db, current_user.company_id, current_user.id, payload)
    return {"user": serialize_user(user)}


@router.get("/{user_id}")
def get_user(user_id: str, current_user: User = Depends(admin_only), db: Session = Depends(get_db)):
    user = user_service.get_user(db, current_user.company_id, user_id)
    return {"user": serialize_user(user)}


@router.patch("/{user_id}")
def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    user = user_service.update_user(db, current_user.company_id, current_user.id, user_id, payload)
    return {"user": serialize_user(user)}


@router.delete("/{user_id}")
def deactivate_user(user_id: str, current_user: User = Depends(admin_only), db: Session = Depends(get_db)):
    user = user_service.deactivate_user(db, current_user.company_id, current_user.id, user_id)
    return {"user": serialize_user(user)}
