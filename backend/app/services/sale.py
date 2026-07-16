from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..models import AuditAction, InventoryTransaction, InventoryTransactionType, Sale, SaleItem, SaleStatus
from ..schemas import SaleRequest
from .audit import write_audit_log
from .product import get_product


def _load(db: Session, sale_id: str) -> Sale | None:
    return db.scalar(
        select(Sale)
        .options(selectinload(Sale.items).joinedload(SaleItem.product), joinedload(Sale.user))
        .where(Sale.id == sale_id)
    )


def list_sales(db: Session, company_id: str) -> list[Sale]:
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items).joinedload(SaleItem.product), joinedload(Sale.user))
        .where(Sale.company_id == company_id)
        .order_by(desc(Sale.created_at))
        .limit(200)
    )
    return db.scalars(stmt).all()


def get_sale(db: Session, company_id: str, sale_id: str) -> Sale:
    sale = db.scalar(
        select(Sale)
        .options(selectinload(Sale.items).joinedload(SaleItem.product), joinedload(Sale.user))
        .where(Sale.id == sale_id, Sale.company_id == company_id)
    )
    if not sale:
        raise HTTPException(404, "Sale not found")
    return sale


def create_sale(db: Session, company_id: str, user_id: str, payload: SaleRequest) -> Sale:
    sale = Sale(company_id=company_id, user_id=user_id, customer_name=payload.customerName, status=SaleStatus.COMPLETED, total_amount=0)
    db.add(sale)
    db.flush()

    total_amount = 0.0
    for item in payload.items:
        product = get_product(db, company_id, item.productId)
        if not product.is_active:
            raise HTTPException(404, f"Product {item.productId} is not available")
        if product.stock_quantity < item.quantity:
            raise HTTPException(422, f"Insufficient stock for {product.name}")

        unit_price = float(product.price)
        subtotal = unit_price * item.quantity
        total_amount += subtotal
        product.stock_quantity -= item.quantity

        db.add(SaleItem(sale_id=sale.id, product_id=product.id, quantity=item.quantity, unit_price=unit_price, subtotal=subtotal))
        db.add(
            InventoryTransaction(
                company_id=company_id,
                product_id=product.id,
                user_id=user_id,
                type=InventoryTransactionType.SALE,
                quantity=item.quantity,
                note="Sold via point of sale",
            )
        )

    sale.total_amount = total_amount
    write_audit_log(db, AuditAction.SALE_CREATED, company_id, user_id)
    db.commit()
    return _load(db, sale.id)


def refund_sale(db: Session, company_id: str, user_id: str, sale_id: str) -> Sale:
    sale = db.scalar(select(Sale).options(selectinload(Sale.items)).where(Sale.id == sale_id, Sale.company_id == company_id))
    if not sale:
        raise HTTPException(404, "Sale not found")
    if sale.status == SaleStatus.REFUNDED:
        raise HTTPException(409, "Sale is already refunded")

    for item in sale.items:
        product = get_product(db, company_id, item.product_id)
        product.stock_quantity += item.quantity
        db.add(
            InventoryTransaction(
                company_id=company_id,
                product_id=item.product_id,
                user_id=user_id,
                type=InventoryTransactionType.RETURN,
                quantity=item.quantity,
                note=f"Refund for sale {sale.id}",
            )
        )

    sale.status = SaleStatus.REFUNDED
    write_audit_log(db, AuditAction.SALE_REFUNDED, company_id, user_id)
    db.commit()
    return _load(db, sale_id)
