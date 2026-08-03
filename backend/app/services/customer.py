from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import desc, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from ..config import get_settings
from ..models import (
    AuditAction,
    AuditEntityType,
    AuditLog,
    Customer,
    CustomerPurchaseSummary,
    CustomerSegment,
    CustomerType,
    Notification,
    Product,
    Sale,
    SaleItem,
    SaleStatus,
    User,
    utcnow,
)
from ..schemas import CustomerRequest, CustomerStatusRequest, UpdateCustomerRequest
from .audit import list_entity_activity, write_audit_log

ENTITY_TYPE = AuditEntityType.CUSTOMER
MAX_CUSTOMER_CODE_ATTEMPTS = 5

# Segmentation and inactivity thresholds live in Settings (see config.py) so they're configurable
# per-deployment via env vars without a code change. Recomputed from scratch (never incrementally)
# every time a customer's purchase summary changes, so retuning them never needs a backfill.

FIELD_MAP = {
    "fullName": "full_name",
    "customerType": "customer_type",
    "dateOfBirth": "date_of_birth",
    "postalCode": "postal_code",
    "preferredChannel": "preferred_channel",
    "isActive": "is_active",
}

SORT_MAP = {
    "customerId": Customer.customer_code.asc(),
    "-customerId": Customer.customer_code.desc(),
    "name": Customer.full_name.asc(),
    "-name": Customer.full_name.desc(),
    "totalSpend": CustomerPurchaseSummary.total_revenue.asc(),
    "-totalSpend": CustomerPurchaseSummary.total_revenue.desc(),
    "totalOrders": CustomerPurchaseSummary.total_orders.asc(),
    "-totalOrders": CustomerPurchaseSummary.total_orders.desc(),
    "lastPurchase": CustomerPurchaseSummary.last_purchase_date.asc(),
    "-lastPurchase": CustomerPurchaseSummary.last_purchase_date.desc(),
    "customerSince": Customer.created_at.asc(),
    "-customerSince": Customer.created_at.desc(),
    "recent": Customer.created_at.desc(),
}

AUDIT_FIELDS = [
    "customer_code",
    "full_name",
    "email",
    "phone",
    "date_of_birth",
    "gender",
    "address",
    "city",
    "state",
    "country",
    "postal_code",
    "customer_type",
    "preferred_channel",
    "is_active",
]


def _audit_snapshot(customer: Customer) -> dict:
    snapshot = {}
    for field in AUDIT_FIELDS:
        value = getattr(customer, field)
        if hasattr(value, "value"):
            value = value.value
        snapshot[field] = value.isoformat() if hasattr(value, "isoformat") else value
    return snapshot


@dataclass
class CustomerAnalyticsFilters:
    date_from: datetime | None = None
    date_to: datetime | None = None
    customer_type: CustomerType | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None


def compute_segment(total_orders: int, total_revenue: float) -> CustomerSegment:
    """New: 0-2 orders. Regular: 3-10. Loyal: 11-30 orders or revenue > 50,000. VIP: orders > 30 or revenue > 200,000."""
    settings = get_settings()
    if total_orders > settings.customer_vip_min_orders or total_revenue > settings.customer_vip_min_revenue:
        return CustomerSegment.VIP
    if total_orders >= settings.customer_loyal_min_orders or total_revenue > settings.customer_loyal_min_revenue:
        return CustomerSegment.LOYAL
    if total_orders >= settings.customer_regular_min_orders:
        return CustomerSegment.REGULAR
    return CustomerSegment.NEW


# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------

def _find_by_email(db: Session, company_id: str, email: str) -> Customer | None:
    return db.scalar(select(Customer).where(Customer.company_id == company_id, func.lower(Customer.email) == email.lower()))


def _find_by_phone(db: Session, company_id: str, phone: str) -> Customer | None:
    return db.scalar(select(Customer).where(Customer.company_id == company_id, Customer.phone == phone))


def _generate_customer_code(db: Session, company_id: str) -> str:
    prefix = "CUST-"
    latest = db.scalar(
        select(Customer.customer_code)
        .where(Customer.company_id == company_id, Customer.customer_code.like(f"{prefix}%"))
        .order_by(desc(Customer.customer_code))
        .limit(1)
    )
    next_number = int(latest.rsplit("-", 1)[1]) + 1 if latest else 1
    return f"{prefix}{next_number:06d}"


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def list_customers(
    db: Session,
    company_id: str,
    search: str | None = None,
    customer_type: CustomerType | None = None,
    is_active: bool | None = None,
    city: str | None = None,
    state: str | None = None,
    country: str | None = None,
    registered_after: datetime | None = None,
    registered_before: datetime | None = None,
    sort: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Customer], int]:
    stmt = select(Customer).outerjoin(CustomerPurchaseSummary, CustomerPurchaseSummary.customer_id == Customer.id).where(
        Customer.company_id == company_id
    )
    if customer_type:
        stmt = stmt.where(Customer.customer_type == customer_type)
    if is_active is not None:
        stmt = stmt.where(Customer.is_active == is_active)
    if city:
        stmt = stmt.where(Customer.city.ilike(f"%{city}%"))
    if state:
        stmt = stmt.where(Customer.state.ilike(f"%{state}%"))
    if country:
        stmt = stmt.where(Customer.country.ilike(f"%{country}%"))
    if registered_after:
        stmt = stmt.where(Customer.created_at >= registered_after)
    if registered_before:
        stmt = stmt.where(Customer.created_at <= registered_before)
    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            or_(
                Customer.full_name.ilike(term),
                Customer.customer_code.ilike(term),
                Customer.email.ilike(term),
                Customer.phone.ilike(term),
            )
        )

    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Customer.id).subquery()))

    stmt = stmt.options(joinedload(Customer.summary)).order_by(SORT_MAP.get(sort or "recent", Customer.created_at.desc()))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    customers = db.scalars(stmt).unique().all()
    return customers, total or 0


def get_customer(db: Session, company_id: str, customer_id: str) -> Customer:
    # Looked up by ID alone first (not company-scoped) so cross-company access attempts can be
    # told apart from genuinely missing records: 404 if the customer doesn't exist anywhere, 403 if
    # it exists but belongs to a different company. Every other customer query in this module stays
    # company_id-scoped in SQL; this is the single canonical single-customer lookup used by the
    # profile, purchase-history, timeline, recent-activity, update, status, and delete endpoints, so
    # fixing it here enforces the 403 rule everywhere a customer_id path param is resolved.
    customer = db.scalar(select(Customer).options(joinedload(Customer.summary)).where(Customer.id == customer_id))
    if not customer:
        raise HTTPException(404, "Customer not found")
    if customer.company_id != company_id:
        raise HTTPException(403, "You do not have access to this customer")
    return customer


def create_customer(
    db: Session, company_id: str, user_id: str, payload: CustomerRequest,
    ip_address: str | None = None, user_agent: str | None = None,
) -> Customer:
    if _find_by_email(db, company_id, payload.email):
        raise HTTPException(409, "A customer with this email already exists")
    if _find_by_phone(db, company_id, payload.phone):
        raise HTTPException(409, "A customer with this phone number already exists")

    for _attempt in range(MAX_CUSTOMER_CODE_ATTEMPTS):
        customer = Customer(
            company_id=company_id,
            customer_code=_generate_customer_code(db, company_id),
            full_name=payload.fullName.strip(),
            email=payload.email.strip().lower(),
            phone=payload.phone.strip(),
            date_of_birth=payload.dateOfBirth,
            gender=payload.gender,
            address=payload.address.strip() if payload.address else None,
            city=payload.city.strip() if payload.city else None,
            state=payload.state.strip() if payload.state else None,
            country=payload.country.strip() if payload.country else None,
            postal_code=payload.postalCode.strip() if payload.postalCode else None,
            customer_type=payload.customerType,
            preferred_channel=payload.preferredChannel,
            is_active=payload.isActive,
        )
        db.add(customer)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            continue

        db.add(CustomerPurchaseSummary(customer_id=customer.id, company_id=company_id, segment=CustomerSegment.NEW))
        write_audit_log(
            db, AuditAction.CUSTOMER_CREATED, company_id, user_id, ip_address, user_agent,
            details=customer.full_name, entity_type=ENTITY_TYPE, entity_id=customer.id,
            previous_values=None, new_values=_audit_snapshot(customer),
        )
        db.add(
            Notification(
                company_id=company_id,
                customer_id=customer.id,
                title="New customer registered",
                message=f"{customer.full_name} was added as a new {customer.customer_type.value.title()} customer.",
            )
        )

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue

        return get_customer(db, company_id, customer.id)

    raise HTTPException(409, "Could not generate a unique customer ID after multiple attempts. Please retry.")


def update_customer(
    db: Session, company_id: str, user_id: str, customer_id: str, payload: UpdateCustomerRequest,
    ip_address: str | None = None, user_agent: str | None = None,
) -> Customer:
    customer = get_customer(db, company_id, customer_id)
    data = payload.model_dump(exclude_unset=True)
    previous_values = _audit_snapshot(customer)

    if "email" in data:
        existing = _find_by_email(db, company_id, data["email"])
        if existing and existing.id != customer.id:
            raise HTTPException(409, "A customer with this email already exists")
    if "phone" in data:
        existing = _find_by_phone(db, company_id, data["phone"])
        if existing and existing.id != customer.id:
            raise HTTPException(409, "A customer with this phone number already exists")

    status_changed = "isActive" in data and data["isActive"] != customer.is_active

    for key, value in data.items():
        attr = FIELD_MAP.get(key, key)
        if isinstance(value, str):
            value = value.strip()
            if attr == "email":
                value = value.lower()
        setattr(customer, attr, value)

    if status_changed:
        action = AuditAction.CUSTOMER_ACTIVATED if customer.is_active else AuditAction.CUSTOMER_DEACTIVATED
        write_audit_log(
            db, action, company_id, user_id, ip_address, user_agent,
            details=customer.full_name, entity_type=ENTITY_TYPE, entity_id=customer.id,
            previous_values=previous_values, new_values=_audit_snapshot(customer),
        )
        if customer.is_active:
            db.add(
                Notification(
                    company_id=company_id,
                    customer_id=customer.id,
                    title="Customer reactivated",
                    message=f"{customer.full_name} was reactivated.",
                )
            )
    else:
        write_audit_log(
            db, AuditAction.CUSTOMER_UPDATED, company_id, user_id, ip_address, user_agent,
            details=customer.full_name, entity_type=ENTITY_TYPE, entity_id=customer.id,
            previous_values=previous_values, new_values=_audit_snapshot(customer),
        )
    db.commit()
    return get_customer(db, company_id, customer_id)


def set_customer_status(
    db: Session, company_id: str, user_id: str, customer_id: str, payload: CustomerStatusRequest,
    ip_address: str | None = None, user_agent: str | None = None,
) -> Customer:
    customer = get_customer(db, company_id, customer_id)
    previous_values = _audit_snapshot(customer)
    customer.is_active = payload.isActive
    action = AuditAction.CUSTOMER_ACTIVATED if payload.isActive else AuditAction.CUSTOMER_DEACTIVATED
    write_audit_log(
        db, action, company_id, user_id, ip_address, user_agent,
        details=customer.full_name, entity_type=ENTITY_TYPE, entity_id=customer.id,
        previous_values=previous_values, new_values=_audit_snapshot(customer),
    )
    if payload.isActive:
        db.add(
            Notification(
                company_id=company_id,
                customer_id=customer.id,
                title="Customer reactivated",
                message=f"{customer.full_name} was reactivated.",
            )
        )
    db.commit()
    return get_customer(db, company_id, customer_id)


def delete_customer(
    db: Session, company_id: str, user_id: str, customer_id: str,
    ip_address: str | None = None, user_agent: str | None = None,
) -> None:
    customer = get_customer(db, company_id, customer_id)
    sales_count = db.scalar(
        select(func.count()).select_from(Sale).where(Sale.customer_id == customer_id, Sale.company_id == company_id)
    )
    if sales_count:
        raise HTTPException(409, "Cannot delete a customer with purchase history. Deactivate them instead.")

    name = customer.full_name
    previous_values = _audit_snapshot(customer)
    db.delete(customer)
    write_audit_log(
        db, AuditAction.CUSTOMER_DELETED, company_id, user_id, ip_address, user_agent,
        details=name, entity_type=ENTITY_TYPE, entity_id=customer_id,
        previous_values=previous_values, new_values=None,
    )
    db.commit()


def list_locations(db: Session, company_id: str) -> list[str]:
    stmt = (
        select(Customer.city)
        .where(Customer.company_id == company_id, Customer.city.is_not(None), Customer.city != "")
        .distinct()
        .order_by(Customer.city.asc())
    )
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Profile, purchase history, timeline
# ---------------------------------------------------------------------------

def get_customer_profile(db: Session, company_id: str, customer_id: str) -> tuple[Customer, list[Sale]]:
    customer = get_customer(db, company_id, customer_id)
    recent_sales = db.scalars(
        select(Sale)
        .options(selectinload(Sale.items).joinedload(SaleItem.product))
        .where(Sale.customer_id == customer_id, Sale.company_id == company_id)
        .order_by(desc(Sale.sale_date))
        .limit(5)
    ).all()
    return customer, recent_sales


def get_purchase_history(
    db: Session, company_id: str, customer_id: str, page: int = 1, page_size: int = 20
) -> tuple[list[Sale], int, list[dict]]:
    get_customer(db, company_id, customer_id)

    stmt = select(Sale).where(Sale.customer_id == customer_id, Sale.company_id == company_id)
    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Sale.id).subquery())) or 0

    stmt = (
        stmt.options(selectinload(Sale.items).joinedload(SaleItem.product))
        .order_by(desc(Sale.sale_date))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    sales = db.scalars(stmt).all()

    frequent_rows = db.execute(
        select(SaleItem.product_id, func.sum(SaleItem.quantity))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.customer_id == customer_id, Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
        .group_by(SaleItem.product_id)
        .order_by(desc(func.sum(SaleItem.quantity)))
        .limit(5)
    ).all()
    product_ids = [row[0] for row in frequent_rows]
    names: dict[str, str] = {}
    if product_ids:
        for product_id, name in db.execute(select(Product.id, Product.name).where(Product.id.in_(product_ids))):
            names[product_id] = name
    frequent_products = [
        {"product_id": row[0], "product_name": names.get(row[0], "Unknown"), "total_quantity": int(row[1] or 0)}
        for row in frequent_rows
    ]

    return sales, total, frequent_products


def get_customer_timeline(db: Session, company_id: str, customer_id: str) -> list[dict]:
    customer = get_customer(db, company_id, customer_id)

    entries: list[dict] = []

    audit_rows = db.execute(
        select(AuditLog, User.name)
        .outerjoin(User, User.id == AuditLog.user_id)
        .where(AuditLog.company_id == company_id, AuditLog.entity_type == ENTITY_TYPE, AuditLog.entity_id == customer_id)
        .order_by(desc(AuditLog.created_at))
    ).all()
    for row, user_name in audit_rows:
        entries.append({"type": row.action.value, "details": row.details, "occurred_at": row.created_at, "performed_by": user_name})

    sale_rows = db.execute(
        select(Sale, User.name)
        .join(User, User.id == Sale.user_id)
        .where(Sale.customer_id == customer_id, Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
        .order_by(desc(Sale.sale_date))
    ).all()

    large_threshold = get_settings().customer_large_purchase_threshold
    for sale, user_name in sale_rows:
        entries.append(
            {
                "type": "PURCHASE_COMPLETED",
                "details": f"Purchase completed - Invoice {sale.invoice_number} (₹{float(sale.total_amount):,.2f})",
                "occurred_at": sale.sale_date,
                "performed_by": user_name,
            }
        )
        # A sale can be both large and a customer's first purchase - each fact gets its own entry,
        # alongside the generic PURCHASE_COMPLETED entry every completed sale always gets.
        if sale.total_amount > large_threshold:
            entries.append(
                {
                    "type": "LARGE_PURCHASE",
                    "details": f"Large purchase - Invoice {sale.invoice_number} (₹{float(sale.total_amount):,.2f})",
                    "occurred_at": sale.sale_date,
                    "performed_by": user_name,
                }
            )

    if customer.summary and customer.summary.first_purchase_date and sale_rows:
        first_sale, first_user_name = min(sale_rows, key=lambda pair: pair[0].sale_date)
        entries.append(
            {
                "type": "FIRST_PURCHASE",
                "details": f"First purchase - Invoice {first_sale.invoice_number}",
                "occurred_at": customer.summary.first_purchase_date,
                "performed_by": first_user_name,
            }
        )

    entries.sort(key=lambda entry: entry["occurred_at"], reverse=True)
    return entries


RECENT_ACTIVITY_ACTIONS = {
    AuditAction.CUSTOMER_CREATED: "Customer Created",
    AuditAction.CUSTOMER_UPDATED: "Profile Updated",
    AuditAction.CUSTOMER_ACTIVATED: "Status Changed",
    AuditAction.CUSTOMER_DEACTIVATED: "Status Changed",
    AuditAction.CUSTOMER_STATUS_CHANGED: "Segment Updated",
    AuditAction.CUSTOMER_VIP_PROMOTED: "VIP Promotion",
}


def get_recent_activity(db: Session, company_id: str, customer_id: str, limit: int = 10) -> list[dict]:
    """Latest customer-facing activity: profile/segment/status events plus completed sales, newest first."""
    get_customer(db, company_id, customer_id)

    entries: list[dict] = []

    audit_rows = db.execute(
        select(AuditLog, User.name)
        .outerjoin(User, User.id == AuditLog.user_id)
        .where(
            AuditLog.company_id == company_id,
            AuditLog.entity_type == ENTITY_TYPE,
            AuditLog.entity_id == customer_id,
            AuditLog.action.in_(RECENT_ACTIVITY_ACTIONS.keys()),
        )
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    ).all()
    for row, user_name in audit_rows:
        entries.append(
            {
                "type": RECENT_ACTIVITY_ACTIONS[row.action],
                "details": row.details,
                "occurred_at": row.created_at,
                "performed_by": user_name,
                "purchase_value": None,
            }
        )

    sale_rows = db.execute(
        select(Sale, User.name)
        .join(User, User.id == Sale.user_id)
        .where(Sale.customer_id == customer_id, Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
        .order_by(desc(Sale.sale_date))
        .limit(limit)
    ).all()
    for sale, user_name in sale_rows:
        entries.append(
            {
                "type": "Sale Completed",
                "details": f"Invoice {sale.invoice_number}",
                "occurred_at": sale.sale_date,
                "performed_by": user_name,
                "purchase_value": float(sale.total_amount),
            }
        )

    entries.sort(key=lambda entry: entry["occurred_at"], reverse=True)
    return entries[:limit]


# ---------------------------------------------------------------------------
# Purchase summary + segmentation (called from services/sale.py)
# ---------------------------------------------------------------------------

def recompute_purchase_summary(db: Session, company_id: str, customer_id: str, user_id: str | None = None) -> None:
    summary = db.scalar(
        select(CustomerPurchaseSummary).where(
            CustomerPurchaseSummary.customer_id == customer_id, CustomerPurchaseSummary.company_id == company_id
        )
    )
    customer = db.scalar(select(Customer).where(Customer.id == customer_id, Customer.company_id == company_id))
    if not summary or not customer:
        return

    previous_segment = summary.segment
    previous_orders = summary.total_orders

    total_orders, total_revenue, first_date, last_date = db.execute(
        select(
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.min(Sale.sale_date),
            func.max(Sale.sale_date),
        ).where(Sale.customer_id == customer_id, Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
    ).one()
    total_orders = total_orders or 0
    total_revenue = float(total_revenue or 0)

    total_quantity = db.scalar(
        select(func.coalesce(func.sum(SaleItem.quantity), 0))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.customer_id == customer_id, Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
    ) or 0

    # Ties (equal total quantity) are broken by whichever product/category was purchased most
    # recently, per the "highest quantity, most recent wins on tie" rule.
    favorite_product_row = db.execute(
        select(SaleItem.product_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.customer_id == customer_id, Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
        .group_by(SaleItem.product_id)
        .order_by(desc(func.sum(SaleItem.quantity)), desc(func.max(Sale.sale_date)))
        .limit(1)
    ).first()
    favorite_product_id = favorite_product_row[0] if favorite_product_row else None

    favorite_category_row = db.execute(
        select(SaleItem.category_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.customer_id == customer_id,
            Sale.company_id == company_id,
            Sale.status == SaleStatus.COMPLETED,
            SaleItem.category_id.is_not(None),
        )
        .group_by(SaleItem.category_id)
        .order_by(desc(func.sum(SaleItem.quantity)), desc(func.max(Sale.sale_date)))
        .limit(1)
    ).first()
    favorite_category_id = favorite_category_row[0] if favorite_category_row else None

    summary.total_orders = total_orders
    summary.total_revenue = total_revenue
    summary.total_quantity = int(total_quantity)
    summary.average_order_value = total_revenue / total_orders if total_orders else 0
    summary.first_purchase_date = first_date
    summary.last_purchase_date = last_date
    summary.favorite_product_id = favorite_product_id
    summary.favorite_category_id = favorite_category_id

    update_customer_segment(db, company_id, customer_id, user_id, customer=customer, summary=summary)

    if previous_orders == 0 and total_orders >= 1:
        db.add(
            Notification(
                company_id=company_id,
                customer_id=customer_id,
                title="First purchase recorded",
                message=f"{customer.full_name} made their first purchase.",
            )
        )

    db.flush()


def update_customer_segment(
    db: Session,
    company_id: str,
    customer_id: str,
    user_id: str | None = None,
    *,
    customer: Customer | None = None,
    summary: CustomerPurchaseSummary | None = None,
) -> CustomerSegment | None:
    """Reusable, standalone segment recalculation for one customer, based on their current purchase
    summary (total_orders / total_revenue). Persists the new segment, logs a VIP-promotion or
    generic segment-change audit entry, and raises a notification on VIP promotion. Called from
    recompute_purchase_summary() after every completed sale, and safe to call on its own (e.g. to
    resync a customer's segment without recomputing their full purchase summary).
    """
    if summary is None:
        summary = db.scalar(
            select(CustomerPurchaseSummary).where(
                CustomerPurchaseSummary.customer_id == customer_id, CustomerPurchaseSummary.company_id == company_id
            )
        )
    if customer is None:
        customer = db.scalar(select(Customer).where(Customer.id == customer_id, Customer.company_id == company_id))
    if not summary or not customer:
        return None

    previous_segment = summary.segment
    new_segment = compute_segment(summary.total_orders, float(summary.total_revenue))
    summary.segment = new_segment

    if new_segment != previous_segment:
        if new_segment == CustomerSegment.VIP:
            write_audit_log(
                db,
                AuditAction.CUSTOMER_VIP_PROMOTED,
                company_id,
                user_id,
                details=f"{customer.full_name} promoted from {previous_segment.value} to VIP",
                entity_type=ENTITY_TYPE,
                entity_id=customer_id,
            )
            db.add(
                Notification(
                    company_id=company_id,
                    customer_id=customer_id,
                    title="Customer reached VIP status",
                    message=f"{customer.full_name} is now a VIP customer.",
                )
            )
        else:
            write_audit_log(
                db,
                AuditAction.CUSTOMER_STATUS_CHANGED,
                company_id,
                user_id,
                details=f"{customer.full_name} segment changed from {previous_segment.value} to {new_segment.value}",
                entity_type=ENTITY_TYPE,
                entity_id=customer_id,
            )

    return new_segment


def check_and_notify_inactive_customers(db: Session, company_id: str) -> None:
    settings = get_settings()
    cutoff = utcnow() - timedelta(days=settings.customer_inactivity_days)
    renotify_cutoff = utcnow() - timedelta(days=settings.customer_inactivity_renotify_days)

    inactive = db.execute(
        select(Customer.id, Customer.full_name)
        .join(CustomerPurchaseSummary, CustomerPurchaseSummary.customer_id == Customer.id)
        .where(
            Customer.company_id == company_id,
            Customer.is_active.is_(True),
            CustomerPurchaseSummary.last_purchase_date.is_not(None),
            CustomerPurchaseSummary.last_purchase_date < cutoff,
        )
    ).all()

    for customer_id, full_name in inactive:
        already_notified = db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.company_id == company_id,
                Notification.customer_id == customer_id,
                Notification.title == "Customer inactive",
                Notification.created_at >= renotify_cutoff,
            )
        )
        if already_notified:
            continue
        db.add(
            Notification(
                company_id=company_id,
                customer_id=customer_id,
                title="Customer inactive",
                message=f"{full_name} has not made a purchase in over {settings.customer_inactivity_days} days.",
            )
        )
    if inactive:
        db.commit()


# ---------------------------------------------------------------------------
# Analytics dashboard
# ---------------------------------------------------------------------------

def _customers_stmt(company_id: str, filters: CustomerAnalyticsFilters):
    stmt = select(Customer).where(Customer.company_id == company_id)
    if filters.customer_type:
        stmt = stmt.where(Customer.customer_type == filters.customer_type)
    if filters.city:
        stmt = stmt.where(Customer.city == filters.city)
    if filters.state:
        stmt = stmt.where(Customer.state == filters.state)
    if filters.country:
        stmt = stmt.where(Customer.country == filters.country)
    return stmt


def customer_analytics_overview(db: Session, company_id: str, filters: CustomerAnalyticsFilters) -> dict:
    check_and_notify_inactive_customers(db, company_id)

    base_stmt = _customers_stmt(company_id, filters)
    customers = db.scalars(base_stmt.options(joinedload(Customer.summary))).unique().all()

    total_customers = len(customers)
    active_customers = sum(1 for c in customers if c.is_active)

    window_start = filters.date_from or (utcnow() - timedelta(days=30))
    window_end = filters.date_to or utcnow()
    new_customers = sum(1 for c in customers if window_start <= c.created_at <= window_end)
    returning_customers = sum(1 for c in customers if c.summary and c.summary.total_orders >= 2)

    purchasing = [c for c in customers if c.summary and c.summary.total_orders > 0]
    average_customer_spend = (sum(float(c.summary.total_revenue) for c in purchasing) / len(purchasing)) if purchasing else 0
    total_revenue_generated = sum(float(c.summary.total_revenue) for c in customers if c.summary)
    average_purchase_frequency = (sum(c.summary.total_orders for c in purchasing) / len(purchasing)) if purchasing else 0

    # Growth trend: cumulative registered customers by month, last 12 months.
    growth_buckets: dict[str, int] = {}
    for c in customers:
        key = c.created_at.date().replace(day=1).isoformat()
        growth_buckets[key] = growth_buckets.get(key, 0) + 1
    cumulative = 0
    growth_trend = []
    for key in sorted(growth_buckets):
        cumulative += growth_buckets[key]
        growth_trend.append({"month": key, "newCustomers": growth_buckets[key], "cumulativeCustomers": cumulative})

    # New vs returning, by month of purchase (based on each sale's month vs the customer's first purchase month).
    sale_rows = db.execute(
        select(Sale.customer_id, Sale.sale_date, CustomerPurchaseSummary.first_purchase_date)
        .join(CustomerPurchaseSummary, CustomerPurchaseSummary.customer_id == Sale.customer_id)
        .join(Customer, Customer.id == Sale.customer_id)
        .where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED, Sale.customer_id.is_not(None))
    ).all()
    new_vs_returning: dict[str, dict[str, int]] = {}
    for _customer_id, sale_date, first_purchase_date in sale_rows:
        key = sale_date.date().replace(day=1).isoformat()
        bucket = new_vs_returning.setdefault(key, {"new": 0, "returning": 0})
        is_first_purchase_month = first_purchase_date and sale_date.date().replace(day=1) == first_purchase_date.date().replace(day=1)
        if is_first_purchase_month:
            bucket["new"] += 1
        else:
            bucket["returning"] += 1
    new_vs_returning_series = [
        {"month": key, "new": new_vs_returning[key]["new"], "returning": new_vs_returning[key]["returning"]}
        for key in sorted(new_vs_returning)
    ]

    # Revenue by customer type.
    revenue_by_type: dict[str, float] = {}
    for c in customers:
        if c.summary:
            revenue_by_type[c.customer_type.value] = revenue_by_type.get(c.customer_type.value, 0) + float(c.summary.total_revenue)
    revenue_by_type_series = [{"customerType": key, "revenue": value} for key, value in revenue_by_type.items()]

    # Top 10 customers by revenue.
    top_customers = sorted((c for c in customers if c.summary), key=lambda c: float(c.summary.total_revenue), reverse=True)[:10]
    top_customers_series = [
        {
            "customerId": c.id,
            "customerCode": c.customer_code,
            "name": c.full_name,
            "revenue": float(c.summary.total_revenue),
            "totalOrders": c.summary.total_orders,
            "favoriteProduct": c.summary.favorite_product.name if c.summary.favorite_product else None,
        }
        for c in top_customers
    ]

    # Purchase frequency distribution (order-count buckets).
    frequency_buckets = {"0": 0, "1": 0, "2-5": 0, "6-15": 0, "16+": 0}
    for c in customers:
        orders = c.summary.total_orders if c.summary else 0
        if orders == 0:
            frequency_buckets["0"] += 1
        elif orders == 1:
            frequency_buckets["1"] += 1
        elif orders <= 5:
            frequency_buckets["2-5"] += 1
        elif orders <= 15:
            frequency_buckets["6-15"] += 1
        else:
            frequency_buckets["16+"] += 1
    purchase_frequency_series = [{"bucket": key, "count": value} for key, value in frequency_buckets.items()]

    # Location distribution (by city).
    location_buckets: dict[str, int] = {}
    for c in customers:
        key = c.city or "Unknown"
        location_buckets[key] = location_buckets.get(key, 0) + 1
    location_distribution = sorted(
        [{"location": key, "count": value} for key, value in location_buckets.items()], key=lambda row: row["count"], reverse=True
    )[:10]

    # Monthly customer acquisition (same underlying data as growth trend, non-cumulative).
    monthly_acquisition = [{"month": key, "count": growth_buckets[key]} for key in sorted(growth_buckets)]

    # Customer spending distribution (revenue buckets).
    spend_buckets = {"0": 0, "1-10K": 0, "10K-50K": 0, "50K-200K": 0, "200K+": 0}
    for c in customers:
        revenue = float(c.summary.total_revenue) if c.summary else 0
        if revenue <= 0:
            spend_buckets["0"] += 1
        elif revenue < 10_000:
            spend_buckets["1-10K"] += 1
        elif revenue < 50_000:
            spend_buckets["10K-50K"] += 1
        elif revenue < 200_000:
            spend_buckets["50K-200K"] += 1
        else:
            spend_buckets["200K+"] += 1
    spending_distribution = [{"bucket": key, "count": value} for key, value in spend_buckets.items()]

    return {
        "kpis": {
            "totalCustomers": total_customers,
            "activeCustomers": active_customers,
            "newCustomers": new_customers,
            "returningCustomers": returning_customers,
            "averageCustomerSpend": average_customer_spend,
            "totalRevenueGenerated": total_revenue_generated,
            "averagePurchaseFrequency": average_purchase_frequency,
        },
        "growthTrend": growth_trend,
        "newVsReturning": new_vs_returning_series,
        "revenueByType": revenue_by_type_series,
        "topCustomers": top_customers_series,
        "purchaseFrequency": purchase_frequency_series,
        "locationDistribution": location_distribution,
        "monthlyAcquisition": monthly_acquisition,
        "spendingDistribution": spending_distribution,
    }


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def _customer_list_rows(db: Session, company_id: str, filters: CustomerAnalyticsFilters) -> tuple[list[str], list[list]]:
    customers = db.scalars(_customers_stmt(company_id, filters).options(joinedload(Customer.summary)).order_by(Customer.full_name)).unique().all()
    headers = ["Customer ID", "Name", "Email", "Phone", "Type", "City", "Status", "Total Orders", "Total Revenue", "Segment"]
    rows = [
        [
            c.customer_code, c.full_name, c.email, c.phone, c.customer_type.value, c.city or "",
            "Active" if c.is_active else "Inactive",
            c.summary.total_orders if c.summary else 0,
            float(c.summary.total_revenue) if c.summary else 0.0,
            c.summary.segment.value if c.summary else CustomerSegment.NEW.value,
        ]
        for c in customers
    ]
    return headers, rows


def _top_customers_rows(db: Session, company_id: str, filters: CustomerAnalyticsFilters) -> tuple[list[str], list[list]]:
    overview = customer_analytics_overview(db, company_id, filters)
    headers = ["Rank", "Customer ID", "Name", "Total Orders", "Total Revenue"]
    rows = [
        [idx + 1, row["customerCode"], row["name"], row["totalOrders"], row["revenue"]]
        for idx, row in enumerate(overview["topCustomers"])
    ]
    return headers, rows


def _customer_analytics_rows(db: Session, company_id: str, filters: CustomerAnalyticsFilters) -> tuple[list[str], list[list]]:
    overview = customer_analytics_overview(db, company_id, filters)
    headers = ["Metric", "Value"]
    kpis = overview["kpis"]
    rows = [
        ["Total Customers", kpis["totalCustomers"]],
        ["Active Customers", kpis["activeCustomers"]],
        ["New Customers", kpis["newCustomers"]],
        ["Returning Customers", kpis["returningCustomers"]],
        ["Average Customer Spend", kpis["averageCustomerSpend"]],
        ["Total Revenue Generated", kpis["totalRevenueGenerated"]],
        ["Average Purchase Frequency", kpis["averagePurchaseFrequency"]],
    ]
    return headers, rows


_EXPORT_BUILDERS = {
    "customer-list": _customer_list_rows,
    "top-customers": _top_customers_rows,
    "customer-analytics": _customer_analytics_rows,
}


def _export_rows(db: Session, company_id: str, section: str, filters: CustomerAnalyticsFilters) -> tuple[list[str], list[list]]:
    builder = _EXPORT_BUILDERS.get(section)
    if not builder:
        raise HTTPException(400, "Unknown export section")
    return builder(db, company_id, filters)


def build_customers_csv(db: Session, company_id: str, section: str, filters: CustomerAnalyticsFilters) -> str:
    import csv
    import io

    headers, rows = _export_rows(db, company_id, section, filters)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue()


def build_customer_audit_logs_csv(
    db: Session,
    company_id: str,
    actions: list[AuditAction] | None,
    date_from: datetime | None,
    date_to: datetime | None,
    search: str | None,
) -> str:
    import csv
    import io

    logs, _ = list_entity_activity(
        db, company_id, AuditEntityType.CUSTOMER, page=1, page_size=10_000,
        actions=actions, date_from=date_from, date_to=date_to, search=search,
    )

    customer_ids = {log.entity_id for log in logs if log.entity_id}
    customer_names: dict[str, str] = {}
    if customer_ids:
        for cid, code, name in db.execute(
            select(Customer.id, Customer.customer_code, Customer.full_name).where(Customer.id.in_(customer_ids))
        ):
            customer_names[cid] = f"{name} ({code})"

    headers = ["Timestamp", "Action", "Customer", "Performed By", "Details", "IP Address"]
    rows = [
        [
            log.created_at.isoformat(),
            log.action.value,
            customer_names.get(log.entity_id, log.entity_id or ""),
            log.user.name if log.user else "System",
            log.details or "",
            log.ip_address or "",
        ]
        for log in logs
    ]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue()


def build_customers_pdf(db: Session, company_id: str, section: str, filters: CustomerAnalyticsFilters) -> bytes:
    from fpdf import FPDF

    headers, rows = _export_rows(db, company_id, section, filters)

    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"RetailPulse - {section.replace('-', ' ').title()} Report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(0, 6, f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    usable_width = pdf.w - 2 * pdf.l_margin
    col_width = usable_width / max(len(headers), 1)

    pdf.set_font("Helvetica", "B", 8)
    for header in headers:
        pdf.cell(col_width, 7, str(header), border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for row in rows[:2000]:
        for value in row:
            text = f"{value:,.2f}" if isinstance(value, float) else str(value)
            pdf.cell(col_width, 6, text[:40], border=1)
        pdf.ln()

    return bytes(pdf.output())
