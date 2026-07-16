from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import UpdateCompanyRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_company
from ..services import company as company_service

router = APIRouter(prefix="/company", tags=["Company"])


@router.get("")
def get_company(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = company_service.get_company(db, current_user.company_id)
    return {"company": serialize_company(company)}


@router.patch("")
def update_company(
    payload: UpdateCompanyRequest,
    current_user: User = Depends(require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
):
    company = company_service.update_company(db, current_user.company_id, current_user.id, payload)
    return {"company": serialize_company(company)}
