from fastapi import HTTPException
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..models import (
    AuditAction,
    AuditEntityType,
    Category,
    Inventory,
    InventoryMovement,
    InventoryMovementType,
    Notification,
    Product,
    StockStatus,
)
from ..schemas import StockAdjustmentRequest
from .audit import write_audit_log

ENTITY_TYPE = AuditEntityType.INVENTORY

SORT_MAP = {
    "name": Product.name.asc(),
    "-name": Product.name.desc(),
    "stock": Inventory.current_stock.asc(),
    "-stock": Inventory.current_stock.desc(),
    "recent": Inventory.updated_at.desc(),
    "-recent": Inventory.updated_at.asc(),
}

ADJUSTMENT_MOVEMENT_TYPE = {
    "STOCK_IN": InventoryMovementType.STOCK_ADDITION,
    "STOCK_OUT": InventoryMovementType.STOCK_REMOVAL,
    "MANUAL_ADJUSTMENT": InventoryMovementType.MANUAL_ADJUSTMENT,
}

ADJUSTMENT_AUDIT_ACTION = {
    "STOCK_IN": AuditAction.STOCK_ADDED,
    "STOCK_OUT": AuditAction.STOCK_REMOVED,
    "MANUAL_ADJUSTMENT": AuditAction.STOCK_ADJUSTED,
}


def _compute_status(available_stock: int, reorder_level: int) -> StockStatus:
    if available_stock <= 0:
        return StockStatus.OUT_OF_STOCK
    if available_stock <= reorder_level:
        return StockStatus.LOW_STOCK
    return StockStatus.IN_STOCK


def get_or_create_inventory(db: Session, company_id: str, product: Product) -> Inventory:
    inventory = db.scalar(
        select(Inventory).where(Inventory.product_id == product.id, Inventory.company_id == company_id)
    )
    if inventory:
        return inventory

    inventory = Inventory(
        company_id=company_id,
        product_id=product.id,
        current_stock=product.stock_quantity,
        reserved_stock=0,
        available_stock=product.stock_quantity,
        reorder_level=product.reorder_level,
        stock_status=_compute_status(product.stock_quantity, product.reorder_level),
    )
    db.add(inventory)
    db.flush()
    return inventory


def _get_inventory_by_id(db: Session, company_id: str, inventory_id: str) -> Inventory:
    inventory = db.scalar(
        select(Inventory)
        .options(joinedload(Inventory.product).joinedload(Product.category))
        .where(Inventory.id == inventory_id, Inventory.company_id == company_id)
    )
    if not inventory:
        raise HTTPException(404, "Inventory record not found")
    return inventory


def _record_status_notifications(
    db: Session,
    company_id: str,
    user_id: str | None,
    product: Product,
    previous_status: StockStatus,
    new_status: StockStatus,
) -> None:
    if new_status == previous_status:
        return

    if new_status == StockStatus.OUT_OF_STOCK:
        db.add(
            Notification(
                company_id=company_id,
                product_id=product.id,
                title="Product out of stock",
                message=f"{product.name} is now out of stock.",
            )
        )
        write_audit_log(db, AuditAction.PRODUCT_OUT_OF_STOCK, company_id, user_id, details=product.name, entity_type=AuditEntityType.PRODUCT)
    elif new_status == StockStatus.LOW_STOCK:
        db.add(
            Notification(
                company_id=company_id,
                product_id=product.id,
                title="Product below reorder level",
                message=f"{product.name} has reached its low stock threshold.",
            )
        )
        write_audit_log(db, AuditAction.PRODUCT_LOW_STOCK, company_id, user_id, details=product.name, entity_type=AuditEntityType.PRODUCT)


def apply_stock_delta(
    db: Session,
    company_id: str,
    user_id: str | None,
    product: Product,
    delta: int,
    movement_type: InventoryMovementType,
    reason: str,
    remarks: str | None = None,
    audit_action: AuditAction = AuditAction.INVENTORY_UPDATED,
    notify_manual: bool = False,
) -> InventoryMovement:
    inventory = get_or_create_inventory(db, company_id, product)

    previous_quantity = product.stock_quantity
    updated_quantity = previous_quantity + delta
    if updated_quantity < 0:
        raise HTTPException(422, "Stock quantity cannot become negative")

    previous_status = inventory.stock_status

    product.stock_quantity = updated_quantity
    inventory.current_stock = updated_quantity
    inventory.available_stock = max(updated_quantity - inventory.reserved_stock, 0)
    inventory.stock_status = _compute_status(inventory.available_stock, inventory.reorder_level)

    movement = InventoryMovement(
        inventory_id=inventory.id,
        movement_type=movement_type,
        quantity_changed=delta,
        previous_quantity=previous_quantity,
        updated_quantity=updated_quantity,
        reason=reason,
        remarks=remarks,
        performed_by=user_id,
    )
    db.add(movement)
    db.flush()

    write_audit_log(db, audit_action, company_id, user_id, details=product.name, entity_type=ENTITY_TYPE)
    _record_status_notifications(db, company_id, user_id, product, previous_status, inventory.stock_status)

    if notify_manual:
        sign = "+" if delta >= 0 else ""
        db.add(
            Notification(
                company_id=company_id,
                product_id=product.id,
                title="Stock manually adjusted",
                message=f"{product.name} stock was adjusted ({sign}{delta}). Reason: {reason}",
            )
        )

    return movement


def list_inventory(
    db: Session,
    company_id: str,
    search: str | None = None,
    category_id: str | None = None,
    brand: str | None = None,
    stock_status: str | None = None,
    sort: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Inventory], int]:
    stmt = select(Inventory).join(Product, Product.id == Inventory.product_id).where(Inventory.company_id == company_id)
    if search:
        term = f"%{search}%"
        stmt = stmt.where(or_(Product.name.ilike(term), Product.sku.ilike(term)))
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if brand:
        stmt = stmt.where(Product.brand.ilike(f"%{brand}%"))
    if stock_status:
        stmt = stmt.where(Inventory.stock_status == stock_status)

    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Inventory.id).subquery())) or 0

    stmt = (
        stmt.options(joinedload(Inventory.product).joinedload(Product.category))
        .order_by(SORT_MAP.get(sort or "recent", Inventory.updated_at.desc()))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return db.scalars(stmt).all(), total


def get_inventory_summary(db: Session, company_id: str) -> dict:
    total_products, total_quantity, low_stock, out_of_stock = db.execute(
        select(
            func.count(Inventory.id),
            func.coalesce(func.sum(Inventory.current_stock), 0),
            func.count(Inventory.id).filter(Inventory.stock_status == StockStatus.LOW_STOCK),
            func.count(Inventory.id).filter(Inventory.stock_status == StockStatus.OUT_OF_STOCK),
        ).where(Inventory.company_id == company_id)
    ).one()
    return {
        "totalProducts": total_products,
        "totalInventoryQuantity": int(total_quantity),
        "lowStockProducts": low_stock,
        "outOfStockProducts": out_of_stock,
    }


def get_inventory_charts(db: Session, company_id: str) -> dict:
    by_category_rows = db.execute(
        select(Category.name, func.coalesce(func.sum(Inventory.current_stock), 0))
        .select_from(Inventory)
        .join(Product, Product.id == Inventory.product_id)
        .join(Category, Category.id == Product.category_id)
        .where(Inventory.company_id == company_id)
        .group_by(Category.name)
        .order_by(Category.name)
    ).all()

    by_status_rows = db.execute(
        select(Inventory.stock_status, func.count(Inventory.id))
        .where(Inventory.company_id == company_id)
        .group_by(Inventory.stock_status)
    ).all()

    return {
        "byCategory": [{"category": name, "totalStock": int(total)} for name, total in by_category_rows],
        "byStatus": [{"status": status.value, "count": count} for status, count in by_status_rows],
    }


def list_movements(
    db: Session,
    company_id: str,
    product_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[InventoryMovement], int]:
    stmt = select(InventoryMovement).join(Inventory, Inventory.id == InventoryMovement.inventory_id).where(Inventory.company_id == company_id)
    if product_id:
        stmt = stmt.where(Inventory.product_id == product_id)

    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(InventoryMovement.id).subquery())) or 0

    stmt = (
        stmt.options(
            joinedload(InventoryMovement.inventory).joinedload(Inventory.product),
            joinedload(InventoryMovement.performer),
        )
        .order_by(desc(InventoryMovement.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return db.scalars(stmt).all(), total


def adjust_stock(db: Session, company_id: str, user_id: str, inventory_id: str, payload: StockAdjustmentRequest) -> InventoryMovement:
    inventory = _get_inventory_by_id(db, company_id, inventory_id)
    product = inventory.product

    if payload.adjustmentType == "STOCK_IN":
        delta = payload.quantity
    elif payload.adjustmentType == "STOCK_OUT":
        delta = -payload.quantity
    else:
        delta = payload.quantity if payload.direction == "INCREASE" else -payload.quantity

    if delta < 0 and payload.quantity > inventory.available_stock:
        raise HTTPException(422, "Stock Out quantity cannot exceed available stock")

    movement = apply_stock_delta(
        db,
        company_id,
        user_id,
        product,
        delta,
        ADJUSTMENT_MOVEMENT_TYPE[payload.adjustmentType],
        reason=payload.reason,
        remarks=payload.remarks,
        audit_action=ADJUSTMENT_AUDIT_ACTION[payload.adjustmentType],
        notify_manual=True,
    )
    db.commit()
    return db.scalar(
        select(InventoryMovement)
        .options(joinedload(InventoryMovement.inventory).joinedload(Inventory.product), joinedload(InventoryMovement.performer))
        .where(InventoryMovement.id == movement.id)
    )


def update_reorder_level(db: Session, company_id: str, user_id: str, inventory_id: str, reorder_level: int) -> Inventory:
    inventory = _get_inventory_by_id(db, company_id, inventory_id)
    inventory.reorder_level = reorder_level
    inventory.stock_status = _compute_status(inventory.available_stock, reorder_level)
    write_audit_log(
        db,
        AuditAction.REORDER_LEVEL_UPDATED,
        company_id,
        user_id,
        details=inventory.product.name if inventory.product else None,
        entity_type=ENTITY_TYPE,
    )
    db.commit()
    return _get_inventory_by_id(db, company_id, inventory_id)
