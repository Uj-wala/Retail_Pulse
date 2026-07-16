from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import get_current_user
from ..services import report as report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/sales")
def get_sales_report(
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.get_sales_report(db, current_user.company_id, from_, to)


@router.get("/inventory")
def get_inventory_report(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return report_service.get_inventory_report(db, current_user.company_id)
