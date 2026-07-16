from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import get_current_user
from ..services import analytics as analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
def get_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return analytics_service.get_summary(db, current_user.company_id)


@router.get("/revenue")
def get_revenue_over_time(
    days: int = Query(default=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    series = analytics_service.get_revenue_over_time(db, current_user.company_id, days)
    return {"series": series}


@router.get("/top-products")
def get_top_products(
    limit: int = Query(default=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    products = analytics_service.get_top_products(db, current_user.company_id, limit)
    return {"products": products}


@router.get("/sales-by-category")
def get_sales_by_category(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    categories = analytics_service.get_sales_by_category(db, current_user.company_id)
    return {"categories": categories}
