from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PaymentMethod, SalesChannel, User, UserRole
from ..schemas import SaleRequest, UpdateSaleRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_sale
from ..services import sale as sale_service

router = APIRouter(prefix="/sales", tags=["Sales"])

can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)


@router.get("")
def list_sales(
    search: str | None = None,
    startDate: datetime | None = None,
    endDate: datetime | None = None,
    categoryId: str | None = None,
    salesChannel: SalesChannel | None = None,
    paymentMethod: PaymentMethod | None = None,
    sort: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sales, total = sale_service.list_sales(
        db,
        current_user.company_id,
        search=search,
        start_date=startDate,
        end_date=endDate,
        category_id=categoryId,
        sales_channel=salesChannel,
        payment_method=paymentMethod,
        sort=sort,
        page=page,
        page_size=pageSize,
    )
    return {"sales": [serialize_sale(s) for s in sales], "total": total, "page": page, "pageSize": pageSize}


@router.get("/summary")
def sales_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return sale_service.sales_summary(db, current_user.company_id)


@router.get("/{sale_id}")
def get_sale(sale_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sale = sale_service.get_sale(db, current_user.company_id, sale_id)
    return {"sale": serialize_sale(sale)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_sale(payload: SaleRequest, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    sale = sale_service.create_sale(db, current_user.company_id, current_user.id, payload)
    return {"sale": serialize_sale(sale)}


@router.patch("/{sale_id}")
def update_sale(sale_id: str, payload: UpdateSaleRequest, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    sale = sale_service.update_sale(db, current_user.company_id, current_user.id, sale_id, payload)
    return {"sale": serialize_sale(sale)}


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(sale_id: str, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    sale_service.delete_sale(db, current_user.company_id, current_user.id, sale_id)
    return None


@router.post("/{sale_id}/refund")
def refund_sale(sale_id: str, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    sale = sale_service.refund_sale(db, current_user.company_id, current_user.id, sale_id)
    return {"sale": serialize_sale(sale)}
