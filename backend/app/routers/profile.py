from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UpdateProfileRequest
from ..security import get_current_user
from ..serializers import serialize_company, serialize_user
from ..services import company as company_service
from ..services import user as user_service

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = user_service.get_profile(db, current_user.id)
    company = company_service.get_company(db, current_user.company_id)
    return {"user": serialize_user(user), "company": serialize_company(company)}


@router.patch("")
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = user_service.update_profile(db, current_user.id, payload)
    return {"user": serialize_user(user)}
