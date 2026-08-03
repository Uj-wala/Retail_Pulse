from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditAction, AuditEntityType, AuditLog, Customer, CustomerType, User, UserRole
from ..schemas import CustomerRequest, CustomerStatusRequest, UpdateCustomerRequest
from ..security import get_current_user, request_meta, require_roles
from ..serializers import serialize_audit_log, serialize_customer, serialize_customer_profile, serialize_sale, serialize_timeline_entry
from ..services import customer as customer_service
from ..services.audit import list_entity_activity, write_audit_log

router = APIRouter(prefix="/customers", tags=["Customers"])

can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
can_view_analytics = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)


def analytics_filters(
    dateFrom: datetime | None = Query(default=None),
    dateTo: datetime | None = Query(default=None),
    customerType: CustomerType | None = Query(default=None),
    city: str | None = Query(default=None),
    state: str | None = Query(default=None),
    country: str | None = Query(default=None),
) -> customer_service.CustomerAnalyticsFilters:
    return customer_service.CustomerAnalyticsFilters(
        date_from=dateFrom, date_to=dateTo, customer_type=customerType, city=city, state=state, country=country
    )


@router.get(
    "",
    summary="List customers",
    description="Returns customers for the authenticated user's company. Supports search (name/customer ID/email/phone), filtering, sorting, and pagination.",
)
def list_customers(
    search: str | None = Query(default=None, description="Case-insensitive substring match on name, customer ID, email, or phone"),
    customerType: CustomerType | None = Query(default=None),
    isActive: bool | None = Query(default=None),
    city: str | None = Query(default=None),
    state: str | None = Query(default=None),
    country: str | None = Query(default=None),
    registeredAfter: datetime | None = Query(default=None),
    registeredBefore: datetime | None = Query(default=None),
    sort: str | None = Query(
        default=None,
        description="One of: customerId, -customerId, name, -name, totalSpend, -totalSpend, totalOrders, -totalOrders, lastPurchase, -lastPurchase, customerSince, -customerSince, recent",
    ),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customers, total = customer_service.list_customers(
        db, current_user.company_id, search, customerType, isActive, city, state, country,
        registeredAfter, registeredBefore, sort, page, pageSize,
    )
    return {"customers": [serialize_customer(c) for c in customers], "total": total, "page": page, "pageSize": pageSize}


@router.get("/locations", summary="List distinct customer cities for the company, for populating filter dropdowns")
def list_locations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"locations": customer_service.list_locations(db, current_user.company_id)}


@router.get("/analytics/overview", summary="Customer Analytics Dashboard KPIs and chart datasets")
def get_customer_analytics_overview(
    filters: customer_service.CustomerAnalyticsFilters = Depends(analytics_filters),
    current_user: User = Depends(can_view_analytics),
    db: Session = Depends(get_db),
):
    return customer_service.customer_analytics_overview(db, current_user.company_id, filters)


@router.get("/analytics/export/csv", summary="Export a Customer report as CSV")
def export_customers_csv(
    request: Request,
    section: Literal["customer-list", "customer-analytics", "top-customers"] = Query(...),
    filters: customer_service.CustomerAnalyticsFilters = Depends(analytics_filters),
    current_user: User = Depends(can_view_analytics),
    db: Session = Depends(get_db),
):
    content = customer_service.build_customers_csv(db, current_user.company_id, section, filters)
    write_audit_log(
        db, AuditAction.CUSTOMER_EXPORTED, current_user.company_id, current_user.id,
        details=f"Customer {section} export (CSV)", entity_type=AuditEntityType.CUSTOMER,
        new_values={"section": section, "format": "CSV"}, **request_meta(request),
    )
    db.commit()
    return Response(
        content=content, media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{section}.csv"'},
    )


@router.get("/analytics/export/pdf", summary="Export a Customer report as PDF")
def export_customers_pdf(
    request: Request,
    section: Literal["customer-list", "customer-analytics", "top-customers"] = Query(...),
    filters: customer_service.CustomerAnalyticsFilters = Depends(analytics_filters),
    current_user: User = Depends(can_view_analytics),
    db: Session = Depends(get_db),
):
    content = customer_service.build_customers_pdf(db, current_user.company_id, section, filters)
    write_audit_log(
        db, AuditAction.CUSTOMER_EXPORTED, current_user.company_id, current_user.id,
        details=f"Customer {section} export (PDF)", entity_type=AuditEntityType.CUSTOMER,
        new_values={"section": section, "format": "PDF"}, **request_meta(request),
    )
    db.commit()
    return Response(
        content=content, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{section}.pdf"'},
    )


def _resolve_customer_names(db: Session, logs: list[AuditLog]) -> dict[str, str]:
    customer_ids = {log.entity_id for log in logs if log.entity_id}
    if not customer_ids:
        return {}
    return {
        cid: f"{name} ({code})"
        for cid, code, name in db.execute(
            select(Customer.id, Customer.customer_code, Customer.full_name).where(Customer.id.in_(customer_ids))
        )
    }


def audit_log_query_params(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=50, ge=1, le=500),
    action: list[AuditAction] | None = Query(default=None, description="Filter by one or more audit actions"),
    dateFrom: datetime | None = Query(default=None),
    dateTo: datetime | None = Query(default=None),
    search: str | None = Query(default=None, description="Case-insensitive substring match on the audit log details (e.g. customer name)"),
) -> dict:
    return {"page": page, "pageSize": pageSize, "action": action, "dateFrom": dateFrom, "dateTo": dateTo, "search": search}


@router.get("/audit-logs", summary="Retrieve customer audit logs for the current company")
def list_customer_audit_logs(
    params: dict = Depends(audit_log_query_params),
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    logs, total = list_entity_activity(
        db, current_user.company_id, AuditEntityType.CUSTOMER,
        page=params["page"], page_size=params["pageSize"], actions=params["action"],
        date_from=params["dateFrom"], date_to=params["dateTo"], search=params["search"],
    )
    names = _resolve_customer_names(db, logs)
    return {
        "auditLogs": [serialize_audit_log(log, names.get(log.entity_id)) for log in logs],
        "total": total, "page": params["page"], "pageSize": params["pageSize"],
    }


@router.get("/audit-logs/export/csv", summary="Export the company's customer audit log as CSV")
def export_customer_audit_logs_csv(
    params: dict = Depends(audit_log_query_params),
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    content = customer_service.build_customer_audit_logs_csv(
        db, current_user.company_id, params["action"], params["dateFrom"], params["dateTo"], params["search"],
    )
    return Response(
        content=content, media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="customer-audit-logs.csv"'},
    )


@router.get("/{customer_id}/audit-logs", summary="Retrieve audit logs for one customer")
def list_single_customer_audit_logs(
    customer_id: str,
    params: dict = Depends(audit_log_query_params),
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    customer = customer_service.get_customer(db, current_user.company_id, customer_id)
    logs, total = list_entity_activity(
        db, current_user.company_id, AuditEntityType.CUSTOMER, entity_id=customer_id,
        page=params["page"], page_size=params["pageSize"], actions=params["action"],
        date_from=params["dateFrom"], date_to=params["dateTo"], search=params["search"],
    )
    customer_name = f"{customer.full_name} ({customer.customer_code})"
    return {
        "auditLogs": [serialize_audit_log(log, customer_name) for log in logs],
        "total": total, "page": params["page"], "pageSize": params["pageSize"],
    }


@router.get("/{customer_id}", summary="Get a customer's full profile")
def get_customer(customer_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    customer, recent_sales = customer_service.get_customer_profile(db, current_user.company_id, customer_id)
    return {"customer": serialize_customer_profile(customer, recent_sales)}


@router.get("/{customer_id}/purchase-history", summary="Paginated purchase history and frequently purchased products for a customer")
def get_purchase_history(
    customer_id: str,
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sales, total, frequent_products = customer_service.get_purchase_history(db, current_user.company_id, customer_id, page, pageSize)
    return {
        "sales": [serialize_sale(sale) for sale in sales],
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "frequentlyPurchasedProducts": frequent_products,
    }


@router.get("/{customer_id}/timeline", summary="Chronological timeline of customer activity")
def get_timeline(customer_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entries = customer_service.get_customer_timeline(db, current_user.company_id, customer_id)
    return {"timeline": [serialize_timeline_entry(entry) for entry in entries]}


@router.get("/{customer_id}/recent-activity", summary="Latest 10 customer activities (profile, segment, status, sales)")
def get_recent_activity(
    customer_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = customer_service.get_recent_activity(db, current_user.company_id, customer_id, limit)
    return {"activities": [serialize_timeline_entry(entry) for entry in entries]}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a customer",
    description="Admin-only. Full Name, Email, Phone, and Customer Type are required. Email and phone must be unique within the company.",
)
def create_customer(payload: CustomerRequest, request: Request, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    customer = customer_service.create_customer(db, current_user.company_id, current_user.id, payload, **request_meta(request))
    return {"customer": serialize_customer(customer)}


@router.patch("/{customer_id}", summary="Update a customer", description="Admin-only. Partial update - only supplied fields are changed.")
def update_customer(
    customer_id: str, payload: UpdateCustomerRequest, request: Request,
    current_user: User = Depends(can_manage), db: Session = Depends(get_db),
):
    customer = customer_service.update_customer(
        db, current_user.company_id, current_user.id, customer_id, payload, **request_meta(request)
    )
    return {"customer": serialize_customer(customer)}


@router.patch("/{customer_id}/status", summary="Activate or deactivate a customer")
def set_customer_status(
    customer_id: str, payload: CustomerStatusRequest, request: Request,
    current_user: User = Depends(can_manage), db: Session = Depends(get_db),
):
    customer = customer_service.set_customer_status(
        db, current_user.company_id, current_user.id, customer_id, payload, **request_meta(request)
    )
    return {"customer": serialize_customer(customer)}


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a customer")
def delete_customer(customer_id: str, request: Request, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    customer_service.delete_customer(db, current_user.company_id, current_user.id, customer_id, **request_meta(request))
