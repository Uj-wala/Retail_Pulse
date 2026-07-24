from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import desc, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from ..models import (
    AuditAction,
    AuditEntityType,
    Category,
    InventoryMovementType,
    PaymentMethod,
    Product,
    Sale,
    SaleItem,
    SaleStatus,
    SalesChannel,
    utcnow,
)
from ..schemas import SaleItemRequest, SaleRequest, UpdateSaleRequest
from .audit import write_audit_log
from .inventory import apply_stock_delta
from .product import get_product

ENTITY_TYPE = AuditEntityType.SALE
MAX_INVOICE_NUMBER_ATTEMPTS = 5

SORT_MAP = {
    "date": Sale.sale_date.asc(),
    "-date": Sale.sale_date.desc(),
    "invoiceNumber": Sale.invoice_number.asc(),
    "-invoiceNumber": Sale.invoice_number.desc(),
    "totalAmount": Sale.total_amount.asc(),
    "-totalAmount": Sale.total_amount.desc(),
}


def _load(db: Session, sale_id: str) -> Sale | None:
    return db.scalar(
        select(Sale)
        .options(
            selectinload(Sale.items).joinedload(SaleItem.product).joinedload(Product.category),
            selectinload(Sale.items).joinedload(SaleItem.category),
            joinedload(Sale.user),
        )
        .where(Sale.id == sale_id)
    )


def _audit_details(invoice_number: str, product_names: list[str]) -> str:
    products = ", ".join(product_names) if product_names else "No products"
    return f"Invoice {invoice_number} | Products: {products}"


def _generate_invoice_number(db: Session, company_id: str, sale_date: datetime | None = None) -> str:
    year = (sale_date or utcnow()).year
    prefix = f"INV-{year}-"
    latest = db.scalar(
        select(Sale.invoice_number)
        .where(Sale.company_id == company_id, Sale.invoice_number.like(f"{prefix}%"))
        .order_by(desc(Sale.invoice_number))
        .limit(1)
    )
    next_number = int(latest.rsplit("-", 1)[1]) + 1 if latest else 1
    return f"{prefix}{next_number:06d}"


def _apply_product_stock_change(
    db: Session,
    company_id: str,
    user_id: str,
    product: Product,
    quantity: int,
    note: str,
) -> None:
    apply_stock_delta(db, company_id, user_id, product, -quantity, InventoryMovementType.SALE, reason=note)

    if product.stock_quantity == 0 and product.is_active:
        product.is_active = False
        write_audit_log(
            db,
            AuditAction.PRODUCT_MARKED_OUT_OF_STOCK,
            company_id,
            user_id,
            details=product.name,
            entity_type=AuditEntityType.PRODUCT,
        )


def _restore_product_stock(
    db: Session,
    company_id: str,
    user_id: str,
    item: SaleItem,
    note: str,
) -> None:
    product = get_product(db, company_id, item.product_id)
    apply_stock_delta(db, company_id, user_id, product, item.quantity, InventoryMovementType.STOCK_ADDITION, reason=note)


def _build_sale_items(
    db: Session,
    company_id: str,
    user_id: str,
    sale: Sale,
    items: list[SaleItemRequest],
) -> tuple[float, list[str]]:
    requested_by_product: dict[str, int] = {}
    for item in items:
        requested_by_product[item.productId] = requested_by_product.get(item.productId, 0) + item.quantity

    for product_id, quantity in requested_by_product.items():
        product = get_product(db, company_id, product_id)
        if not product.is_active:
            raise HTTPException(422, f"{product.name} is out of stock or inactive")
        if product.stock_quantity < quantity:
            raise HTTPException(422, f"Insufficient stock for {product.name}. Available: {product.stock_quantity}")

    total_amount = 0.0
    product_names: list[str] = []
    for item in items:
        product = get_product(db, company_id, item.productId)
        unit_price = float(item.unitPrice if item.unitPrice is not None else product.unit_price)
        product_value = unit_price * item.quantity
        if item.discount > product_value:
            raise HTTPException(422, f"Discount cannot exceed product value for {product.name}")

        line_total = product_value - item.discount + item.tax
        total_amount += line_total
        product_names.append(product.name)

        db.add(
            SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                category_id=product.category_id,
                quantity=item.quantity,
                unit_price=unit_price,
                discount=item.discount,
                tax=item.tax,
                subtotal=product_value,
                total=line_total,
            )
        )
        _apply_product_stock_change(db, company_id, user_id, product, item.quantity, f"Sale {sale.invoice_number}")

    return total_amount, product_names


def list_sales(
    db: Session,
    company_id: str,
    search: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category_id: str | None = None,
    sales_channel: SalesChannel | None = None,
    payment_method: PaymentMethod | None = None,
    sort: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Sale], int]:
    stmt = select(Sale).where(Sale.company_id == company_id)
    if search:
        term = f"%{search}%"
        stmt = stmt.join(SaleItem, SaleItem.sale_id == Sale.id, isouter=True).join(Product, Product.id == SaleItem.product_id, isouter=True)
        stmt = stmt.where(
            or_(Sale.invoice_number.ilike(term), Sale.customer_name.ilike(term), Product.name.ilike(term))
        )
    if start_date:
        stmt = stmt.where(Sale.sale_date >= start_date)
    if end_date:
        stmt = stmt.where(Sale.sale_date <= end_date)
    if category_id:
        stmt = stmt.join(SaleItem, SaleItem.sale_id == Sale.id).where(SaleItem.category_id == category_id)
    if sales_channel:
        stmt = stmt.where(Sale.sales_channel == sales_channel)
    if payment_method:
        stmt = stmt.where(Sale.payment_method == payment_method)

    count_subquery = stmt.with_only_columns(Sale.id).distinct().subquery()
    total = db.scalar(select(func.count()).select_from(count_subquery)) or 0

    stmt = (
        stmt.distinct()
        .options(
            selectinload(Sale.items).joinedload(SaleItem.product).joinedload(Product.category),
            selectinload(Sale.items).joinedload(SaleItem.category),
            joinedload(Sale.user),
        )
        .order_by(SORT_MAP.get(sort or "-date", Sale.sale_date.desc()))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return db.scalars(stmt).all(), total


def get_sale(db: Session, company_id: str, sale_id: str) -> Sale:
    sale = db.scalar(
        select(Sale)
        .options(
            selectinload(Sale.items).joinedload(SaleItem.product).joinedload(Product.category),
            selectinload(Sale.items).joinedload(SaleItem.category),
            joinedload(Sale.user),
        )
        .where(Sale.id == sale_id, Sale.company_id == company_id)
    )
    if not sale:
        raise HTTPException(404, "Sale not found")
    return sale


def create_sale(db: Session, company_id: str, user_id: str, payload: SaleRequest) -> Sale:
    # Invoice numbers are assigned by reading the current max and incrementing, which is not
    # atomic on its own. Concurrent requests can compute the same candidate number, so instead
    # of relying on a pre-check (which has the same race), we rely on the DB-level
    # UniqueConstraint("company_id", "invoice_number") on Sale and retry with a freshly
    # generated number whenever it's violated.
    sale_date = payload.saleDate or utcnow()

    for attempt in range(MAX_INVOICE_NUMBER_ATTEMPTS):
        invoice_number = _generate_invoice_number(db, company_id, sale_date)
        sale = Sale(
            company_id=company_id,
            user_id=user_id,
            invoice_number=invoice_number,
            customer_name=payload.customerName.strip() if payload.customerName else None,
            sale_date=sale_date,
            sales_channel=payload.salesChannel,
            payment_method=payload.paymentMethod,
            status=SaleStatus.COMPLETED,
            total_amount=0,
        )
        db.add(sale)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            continue

        total_amount, product_names = _build_sale_items(db, company_id, user_id, sale, payload.items)
        sale.total_amount = total_amount
        write_audit_log(db, AuditAction.SALE_CREATED, company_id, user_id, details=_audit_details(invoice_number, product_names), entity_type=ENTITY_TYPE)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue

        return _load(db, sale.id)

    raise HTTPException(409, "Could not generate a unique invoice number after multiple attempts. Please retry.")


def update_sale(db: Session, company_id: str, user_id: str, sale_id: str, payload: UpdateSaleRequest) -> Sale:
    sale = db.scalar(select(Sale).options(selectinload(Sale.items)).where(Sale.id == sale_id, Sale.company_id == company_id))
    if not sale:
        raise HTTPException(404, "Sale not found")
    if sale.status != SaleStatus.COMPLETED:
        raise HTTPException(409, "Only completed sales can be edited")

    if payload.customerName is not None:
        sale.customer_name = payload.customerName.strip() or None
    if payload.saleDate is not None:
        sale.sale_date = payload.saleDate
    if payload.salesChannel is not None:
        sale.sales_channel = payload.salesChannel
    if payload.paymentMethod is not None:
        sale.payment_method = payload.paymentMethod

    product_names: list[str] = []
    if payload.items is not None:
        for item in list(sale.items):
            _restore_product_stock(db, company_id, user_id, item, f"Edit reversal for {sale.invoice_number}")
            db.delete(item)
        db.flush()

        total_amount, product_names = _build_sale_items(db, company_id, user_id, sale, payload.items)
        sale.total_amount = total_amount

    write_audit_log(db, AuditAction.SALE_UPDATED, company_id, user_id, details=_audit_details(sale.invoice_number, product_names), entity_type=ENTITY_TYPE)
    db.commit()
    return _load(db, sale_id)


def delete_sale(db: Session, company_id: str, user_id: str, sale_id: str) -> None:
    sale = db.scalar(select(Sale).options(selectinload(Sale.items).joinedload(SaleItem.product)).where(Sale.id == sale_id, Sale.company_id == company_id))
    if not sale:
        raise HTTPException(404, "Sale not found")
    invoice_number = sale.invoice_number
    product_names = [item.product.name for item in sale.items if item.product]
    if sale.status == SaleStatus.COMPLETED:
        for item in sale.items:
            _restore_product_stock(db, company_id, user_id, item, f"Deleted sale {invoice_number}")

    db.delete(sale)
    write_audit_log(db, AuditAction.SALE_DELETED, company_id, user_id, details=_audit_details(invoice_number, product_names), entity_type=ENTITY_TYPE)
    db.commit()


def refund_sale(db: Session, company_id: str, user_id: str, sale_id: str) -> Sale:
    sale = db.scalar(select(Sale).options(selectinload(Sale.items)).where(Sale.id == sale_id, Sale.company_id == company_id))
    if not sale:
        raise HTTPException(404, "Sale not found")
    if sale.status == SaleStatus.REFUNDED:
        raise HTTPException(409, "Sale is already refunded")

    for item in sale.items:
        _restore_product_stock(db, company_id, user_id, item, f"Refund for {sale.invoice_number}")

    sale.status = SaleStatus.REFUNDED
    write_audit_log(db, AuditAction.SALE_REFUNDED, company_id, user_id, details=sale.invoice_number, entity_type=ENTITY_TYPE)
    db.commit()
    return _load(db, sale_id)


def sales_summary(db: Session, company_id: str) -> dict:
    total_revenue, total_orders = db.execute(
        select(func.coalesce(func.sum(Sale.total_amount), 0), func.count(Sale.id)).where(
            Sale.company_id == company_id,
            Sale.status == SaleStatus.COMPLETED,
        )
    ).one()
    average_order_value = float(total_revenue) / total_orders if total_orders else 0
    return {
        "totalSales": float(total_revenue),
        "totalRevenue": float(total_revenue),
        "totalOrders": total_orders,
        "averageOrderValue": average_order_value,
    }
