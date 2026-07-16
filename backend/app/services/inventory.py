from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from ..models import AuditAction, InventoryTransaction, InventoryTransactionType, Product
from ..schemas import InventoryTransactionRequest
from .audit import write_audit_log
from .product import get_product


def _direction_for(type_: InventoryTransactionType) -> int:
    return 1 if type_ in (InventoryTransactionType.RESTOCK, InventoryTransactionType.RETURN) else -1


def list_inventory_transactions(db: Session, company_id: str, product_id: str | None = None) -> list[InventoryTransaction]:
    stmt = (
        select(InventoryTransaction)
        .options(joinedload(InventoryTransaction.product))
        .where(InventoryTransaction.company_id == company_id)
    )
    if product_id:
        stmt = stmt.where(InventoryTransaction.product_id == product_id)
    return db.scalars(stmt.order_by(desc(InventoryTransaction.created_at)).limit(200)).all()


def record_inventory_transaction(
    db: Session, company_id: str, user_id: str, payload: InventoryTransactionRequest
) -> InventoryTransaction:
    product: Product = get_product(db, company_id, payload.productId)

    delta = _direction_for(payload.type) * payload.quantity
    if product.stock_quantity + delta < 0:
        raise HTTPException(422, "Adjustment would result in negative stock")

    product.stock_quantity += delta
    transaction = InventoryTransaction(
        company_id=company_id,
        product_id=product.id,
        user_id=user_id,
        type=payload.type,
        quantity=payload.quantity,
        note=payload.note,
    )
    db.add(transaction)
    db.flush()
    write_audit_log(db, AuditAction.INVENTORY_ADJUSTED, company_id, user_id)
    db.commit()
    return db.scalar(
        select(InventoryTransaction)
        .options(joinedload(InventoryTransaction.product))
        .where(InventoryTransaction.id == transaction.id)
    )
