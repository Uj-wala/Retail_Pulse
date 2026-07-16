from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..models import AuditAction, Product
from ..schemas import ProductRequest, UpdateProductRequest
from .audit import write_audit_log

FIELD_MAP = {
    "categoryId": "category_id",
    "stockQuantity": "stock_quantity",
    "reorderLevel": "reorder_level",
    "isActive": "is_active",
}


def list_products(
    db: Session,
    company_id: str,
    search: str | None = None,
    category_id: str | None = None,
    is_active: bool | None = None,
) -> list[Product]:
    stmt = select(Product).options(joinedload(Product.category)).where(Product.company_id == company_id)
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if is_active is not None:
        stmt = stmt.where(Product.is_active == is_active)
    if search:
        term = f"%{search}%"
        stmt = stmt.where(or_(Product.name.ilike(term), Product.sku.ilike(term)))
    return db.scalars(stmt.order_by(Product.created_at.desc())).all()


def get_product(db: Session, company_id: str, product_id: str) -> Product:
    product = db.scalar(
        select(Product).options(joinedload(Product.category)).where(Product.id == product_id, Product.company_id == company_id)
    )
    if not product:
        raise HTTPException(404, "Product not found")
    return product


def _find_by_sku(db: Session, company_id: str, sku: str) -> Product | None:
    return db.scalar(
        select(Product).where(Product.company_id == company_id, func.lower(Product.sku) == sku.lower())
    )


def create_product(db: Session, company_id: str, user_id: str, payload: ProductRequest) -> Product:
    if _find_by_sku(db, company_id, payload.sku):
        raise HTTPException(409, "A product with this SKU already exists")

    product = Product(
        company_id=company_id,
        category_id=payload.categoryId,
        sku=payload.sku.strip(),
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        price=payload.price,
        cost=payload.cost,
        stock_quantity=payload.stockQuantity,
        reorder_level=payload.reorderLevel,
        is_active=payload.isActive,
    )
    db.add(product)
    db.flush()
    write_audit_log(db, AuditAction.PRODUCT_CREATED, company_id, user_id)
    db.commit()
    return get_product(db, company_id, product.id)


def update_product(db: Session, company_id: str, user_id: str, product_id: str, payload: UpdateProductRequest) -> Product:
    product = get_product(db, company_id, product_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        attr = FIELD_MAP.get(key, key)
        setattr(product, attr, value.strip() if isinstance(value, str) else value)
    write_audit_log(db, AuditAction.PRODUCT_UPDATED, company_id, user_id)
    db.commit()
    return get_product(db, company_id, product_id)


def delete_product(db: Session, company_id: str, user_id: str, product_id: str) -> None:
    product = get_product(db, company_id, product_id)
    db.delete(product)
    write_audit_log(db, AuditAction.PRODUCT_DELETED, company_id, user_id)
    db.commit()


def low_stock_products(db: Session, company_id: str) -> list[Product]:
    stmt = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.company_id == company_id, Product.is_active.is_(True), Product.stock_quantity <= Product.reorder_level)
        .order_by(Product.stock_quantity.asc())
    )
    return db.scalars(stmt).all()
