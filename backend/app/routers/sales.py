from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import SaleRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_sale
from ..services import sale as sale_service

router = APIRouter(prefix="/sales", tags=["Sales"])

can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)


@router.get("")
def list_sales(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sales = sale_service.list_sales(db, current_user.company_id)
    return {"sales": [serialize_sale(s) for s in sales], "total": len(sales)}


@router.get("/{sale_id}")
def get_sale(sale_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sale = sale_service.get_sale(db, current_user.company_id, sale_id)
    return {"sale": serialize_sale(sale)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_sale(payload: SaleRequest, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    sale = sale_service.create_sale(db, current_user.company_id, current_user.id, payload)
    return {"sale": serialize_sale(sale)}


@router.post("/{sale_id}/refund")
def refund_sale(sale_id: str, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    sale = sale_service.refund_sale(db, current_user.company_id, current_user.id, sale_id)
    return {"sale": serialize_sale(sale)}
