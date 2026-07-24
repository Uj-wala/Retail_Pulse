from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..models import AuditAction, AuditEntityType, Category, Inventory, InventoryMovement, Product, SaleItem
from ..schemas import ProductRequest, ProductStatusRequest, UpdateProductRequest
from .audit import write_audit_log
from .inventory import get_or_create_inventory

ENTITY_TYPE = AuditEntityType.PRODUCT

FIELD_MAP = {
    "categoryId": "category_id",
    "unitPrice": "unit_price",
    "costPrice": "cost_price",
    "stockQuantity": "stock_quantity",
    "reorderLevel": "reorder_level",
    "unitOfMeasure": "unit_of_measure",
    "isActive": "is_active",
}

SORT_MAP = {
    "name": Product.name.asc(),
    "-name": Product.name.desc(),
    "unitPrice": Product.unit_price.asc(),
    "-unitPrice": Product.unit_price.desc(),
    "recent": Product.created_at.desc(),
}


def list_products(
    db: Session,
    company_id: str,
    search: str | None = None,
    category_id: str | None = None,
    is_active: bool | None = None,
    brand: str | None = None,
    sort: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Product], int]:
    stmt = select(Product).where(Product.company_id == company_id)
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if is_active is not None:
        stmt = stmt.where(Product.is_active == is_active)
    if brand:
        stmt = stmt.where(Product.brand.ilike(f"%{brand}%"))
    if search:
        term = f"%{search}%"
        stmt = stmt.where(or_(Product.name.ilike(term), Product.sku.ilike(term), Product.brand.ilike(term)))

    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Product.id).subquery()))

    stmt = stmt.options(joinedload(Product.category)).order_by(SORT_MAP.get(sort or "recent", Product.created_at.desc()))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    products = db.scalars(stmt).all()
    return products, total or 0


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


def _find_by_name_in_category(db: Session, company_id: str, category_id: str, name: str) -> Product | None:
    return db.scalar(
        select(Product).where(
            Product.company_id == company_id,
            Product.category_id == category_id,
            func.lower(Product.name) == name.lower(),
        )
    )


def _ensure_category(db: Session, company_id: str, category_id: str) -> None:
    category = db.scalar(select(Category).where(Category.id == category_id, Category.company_id == company_id))
    if not category:
        raise HTTPException(404, "Category not found")


def create_product(db: Session, company_id: str, user_id: str, payload: ProductRequest) -> Product:
    _ensure_category(db, company_id, payload.categoryId)

    if _find_by_sku(db, company_id, payload.sku):
        raise HTTPException(409, "A product with this SKU already exists")
    if _find_by_name_in_category(db, company_id, payload.categoryId, payload.name):
        raise HTTPException(409, "A product with this name already exists in the selected category")

    product = Product(
        company_id=company_id,
        category_id=payload.categoryId,
        sku=payload.sku.strip(),
        name=payload.name.strip(),
        brand=payload.brand.strip() if payload.brand else None,
        description=payload.description.strip() if payload.description else None,
        unit_price=payload.unitPrice,
        cost_price=payload.costPrice,
        stock_quantity=payload.stockQuantity,
        reorder_level=payload.reorderLevel,
        unit_of_measure=payload.unitOfMeasure.strip(),
        is_active=payload.isActive,
    )
    db.add(product)
    db.flush()
    get_or_create_inventory(db, company_id, product)
    write_audit_log(db, AuditAction.PRODUCT_CREATED, company_id, user_id, details=product.name, entity_type=ENTITY_TYPE)
    db.commit()
    return get_product(db, company_id, product.id)


def update_product(db: Session, company_id: str, user_id: str, product_id: str, payload: UpdateProductRequest) -> Product:
    product = get_product(db, company_id, product_id)
    data = payload.model_dump(exclude_unset=True)

    new_category_id = data.get("categoryId", product.category_id)
    new_name = data.get("name", product.name)
    new_price = data.get("unitPrice", float(product.unit_price))
    new_cost = data.get("costPrice", float(product.cost_price))

    if new_cost > new_price:
        raise HTTPException(422, "Cost Price cannot exceed Unit Price")

    if "categoryId" in data:
        _ensure_category(db, company_id, new_category_id)

    if "sku" in data:
        existing = _find_by_sku(db, company_id, data["sku"])
        if existing and existing.id != product.id:
            raise HTTPException(409, "A product with this SKU already exists")

    if "name" in data or "categoryId" in data:
        existing = _find_by_name_in_category(db, company_id, new_category_id, new_name)
        if existing and existing.id != product.id:
            raise HTTPException(409, "A product with this name already exists in the selected category")

    status_changed = "isActive" in data and data["isActive"] != product.is_active

    for key, value in data.items():
        attr = FIELD_MAP.get(key, key)
        setattr(product, attr, value.strip() if isinstance(value, str) else value)

    if status_changed:
        action = AuditAction.PRODUCT_ACTIVATED if product.is_active else AuditAction.PRODUCT_DEACTIVATED
        write_audit_log(db, action, company_id, user_id, details=product.name, entity_type=ENTITY_TYPE)
    else:
        write_audit_log(db, AuditAction.PRODUCT_UPDATED, company_id, user_id, details=product.name, entity_type=ENTITY_TYPE)
    db.commit()
    return get_product(db, company_id, product_id)


def set_product_status(db: Session, company_id: str, user_id: str, product_id: str, payload: ProductStatusRequest) -> Product:
    product = get_product(db, company_id, product_id)
    product.is_active = payload.isActive
    action = AuditAction.PRODUCT_ACTIVATED if payload.isActive else AuditAction.PRODUCT_DEACTIVATED
    write_audit_log(db, action, company_id, user_id, details=product.name, entity_type=ENTITY_TYPE)
    db.commit()
    return get_product(db, company_id, product_id)


def delete_product(db: Session, company_id: str, user_id: str, product_id: str) -> None:
    product = get_product(db, company_id, product_id)
    historical_count = db.scalar(
        select(func.count())
        .select_from(SaleItem)
        .join(Product, Product.id == SaleItem.product_id)
        .where(Product.id == product_id, Product.company_id == company_id)
    )
    movement_count = db.scalar(
        select(func.count(InventoryMovement.id))
        .select_from(InventoryMovement)
        .join(Inventory, Inventory.id == InventoryMovement.inventory_id)
        .where(Inventory.product_id == product_id, Inventory.company_id == company_id)
    )
    if historical_count or movement_count:
        raise HTTPException(409, "Cannot delete a product with sales or inventory history. Deactivate it instead.")

    name = product.name
    inventory = db.scalar(select(Inventory).where(Inventory.product_id == product_id))
    if inventory:
        db.delete(inventory)
    db.delete(product)
    write_audit_log(db, AuditAction.PRODUCT_DELETED, company_id, user_id, details=name, entity_type=ENTITY_TYPE)
    db.commit()


def low_stock_products(db: Session, company_id: str) -> list[Product]:
    stmt = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.company_id == company_id, Product.is_active.is_(True), Product.stock_quantity <= Product.reorder_level)
        .order_by(Product.stock_quantity.asc())
    )
    return db.scalars(stmt).all()
