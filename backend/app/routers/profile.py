from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UpdateProfileRequest
from ..security import get_current_user
from ..serializers import serialize_audit_log, serialize_company, serialize_user
from ..services import audit as audit_service
from ..services import company as company_service
from ..services import user as user_service

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = user_service.get_profile(db, current_user.id)
    company = company_service.get_company(db, current_user.company_id)
    return {"user": serialize_user(user), "company": serialize_company(company)}


@router.get(
    "/activity",
    summary="List the authenticated user's recent activity",
    description="Returns the user's most recent audit log entries, scoped to their own company and account.",
)
def get_activity(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = audit_service.list_user_activity(db, current_user.company_id, current_user.id, limit)
    return {"activity": [serialize_audit_log(log) for log in logs]}


@router.patch("")
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = user_service.update_profile(db, current_user.id, payload)
    return {"user": serialize_user(user)}
