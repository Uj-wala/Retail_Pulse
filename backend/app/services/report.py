from datetime import datetime

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..models import Product, Sale, SaleItem, SaleStatus
from .product import low_stock_products


def get_sales_report(db: Session, company_id: str, date_from: datetime | None, date_to: datetime | None) -> dict:
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items), joinedload(Sale.user))
        .where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
    )
    if date_from:
        stmt = stmt.where(Sale.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Sale.created_at <= date_to)
    sales = db.scalars(stmt.order_by(desc(Sale.created_at))).all()

    return {
        "total_revenue": sum(float(sale.total_amount) for sale in sales),
        "total_orders": len(sales),
        "total_units_sold": sum(sum(item.quantity for item in sale.items) for sale in sales),
        "sales": [
            {
                "id": sale.id,
                "cashier_name": sale.user.name,
                "customer_name": sale.customer_name,
                "total_amount": float(sale.total_amount),
                "item_count": len(sale.items),
                "created_at": sale.created_at.isoformat(),
            }
            for sale in sales
        ],
    }


def get_inventory_report(db: Session, company_id: str) -> dict:
    products = db.scalars(
        select(Product).options(joinedload(Product.category)).where(Product.company_id == company_id).order_by(Product.stock_quantity)
    ).all()
    low_stock_count = len(low_stock_products(db, company_id))

    return {
        "total_products": len(products),
        "total_stock_units": sum(product.stock_quantity for product in products),
        "inventory_value": sum(float(product.cost) * product.stock_quantity for product in products),
        "low_stock_count": low_stock_count,
        "products": [
            {
                "id": product.id,
                "sku": product.sku,
                "name": product.name,
                "category_name": product.category.name if product.category else None,
                "stock_quantity": product.stock_quantity,
                "reorder_level": product.reorder_level,
                "low_stock": product.stock_quantity <= product.reorder_level,
            }
            for product in products
        ],
    }
