from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from ..models import Category, Product, Sale, SaleItem, SaleStatus
from .product import low_stock_products


def get_summary(db: Session, company_id: str) -> dict:
    total_revenue = db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
    )
    total_orders = db.scalar(select(func.count(Sale.id)).where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED))
    total_customers = db.scalar(
        select(func.count(func.distinct(Sale.customer_name))).where(
            Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED, Sale.customer_name.is_not(None)
        )
    )
    low_stock_count = len(low_stock_products(db, company_id))
    return {
        "total_revenue": float(total_revenue or 0),
        "total_orders": total_orders or 0,
        "total_customers": total_customers or 0,
        "low_stock_count": low_stock_count,
    }


def get_revenue_over_time(db: Session, company_id: str, days: int = 30) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    sales = db.scalars(
        select(Sale).where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED, Sale.created_at >= since)
    ).all()

    buckets: dict[str, float] = {}
    for sale in sales:
        day = sale.created_at.date().isoformat()
        buckets[day] = buckets.get(day, 0) + float(sale.total_amount)

    return [{"date": day, "revenue": buckets[day]} for day in sorted(buckets)]


def get_top_products(db: Session, company_id: str, limit: int = 5) -> list[dict]:
    rows = db.execute(
        select(SaleItem.product_id, func.sum(SaleItem.quantity), func.sum(SaleItem.subtotal))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
        .group_by(SaleItem.product_id)
        .order_by(desc(func.sum(SaleItem.quantity)))
        .limit(limit)
    ).all()

    product_ids = [row[0] for row in rows]
    names = {}
    if product_ids:
        for product_id, name in db.execute(select(Product.id, Product.name).where(Product.id.in_(product_ids))):
            names[product_id] = name

    return [
        {
            "product_id": row[0],
            "product_name": names.get(row[0], "Unknown"),
            "units_sold": int(row[1] or 0),
            "revenue": float(row[2] or 0),
        }
        for row in rows
    ]


def get_sales_by_category(db: Session, company_id: str) -> list[dict]:
    rows = db.execute(
        select(func.coalesce(Category.name, "Uncategorized"), func.sum(SaleItem.subtotal))
        .join(Product, Product.id == SaleItem.product_id)
        .outerjoin(Category, Category.id == Product.category_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
        .group_by(Category.name)
    ).all()
    return [{"category": row[0], "revenue": float(row[1] or 0)} for row in rows]
