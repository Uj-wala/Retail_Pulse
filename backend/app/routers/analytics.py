import json
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditAction, AuditEntityType, PaymentMethod, SalesChannel, User, UserRole
from ..schemas import DashboardAuditRequest
from ..security import get_current_user, request_meta, require_roles
from ..services import analytics as analytics_service
from ..services.audit import write_audit_log

router = APIRouter(prefix="/analytics", tags=["Analytics"])

can_view_dashboard = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)


# ---------------------------------------------------------------------------
# Legacy summary endpoints (used by the simple /dashboard landing page,
# available to all authenticated roles)
# ---------------------------------------------------------------------------

@router.get("/summary")
def get_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return analytics_service.get_summary(db, current_user.company_id)


@router.get("/revenue")
def get_revenue_over_time(
    days: int = Query(default=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    series = analytics_service.get_revenue_over_time(db, current_user.company_id, days)
    return {"series": series}


@router.get("/top-products")
def get_top_products(
    limit: int = Query(default=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    products = analytics_service.get_top_products(db, current_user.company_id, limit)
    return {"products": products}


@router.get("/sales-by-category")
def get_sales_by_category(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    categories = analytics_service.get_sales_by_category(db, current_user.company_id)
    return {"categories": categories}


# ---------------------------------------------------------------------------
# Retail Analytics Dashboard (Company Admins & Analysts only)
# ---------------------------------------------------------------------------

def dashboard_filters(
    dateFrom: datetime | None = Query(default=None),
    dateTo: datetime | None = Query(default=None),
    productId: str | None = Query(default=None),
    categoryId: str | None = Query(default=None),
    brand: str | None = Query(default=None),
    salesChannel: SalesChannel | None = Query(default=None),
    paymentMethod: PaymentMethod | None = Query(default=None),
) -> analytics_service.DashboardFilters:
    return analytics_service.DashboardFilters(
        date_from=dateFrom,
        date_to=dateTo,
        product_id=productId,
        category_id=categoryId,
        brand=brand,
        sales_channel=salesChannel,
        payment_method=paymentMethod,
    )


@router.get("/dashboard/overview")
def get_dashboard_overview(
    granularity: Literal["daily", "weekly", "monthly"] = Query(default="daily"),
    filters: analytics_service.DashboardFilters = Depends(dashboard_filters),
    current_user: User = Depends(can_view_dashboard),
    db: Session = Depends(get_db),
):
    return analytics_service.get_overview(db, current_user.company_id, filters, granularity)


@router.get("/dashboard/filter-options")
def get_dashboard_filter_options(
    current_user: User = Depends(can_view_dashboard),
    db: Session = Depends(get_db),
):
    return analytics_service.get_filter_options(db, current_user.company_id)


@router.get("/dashboard/drilldown/kpi/{kpi}")
def get_dashboard_kpi_drilldown(
    kpi: str,
    filters: analytics_service.DashboardFilters = Depends(dashboard_filters),
    current_user: User = Depends(can_view_dashboard),
    db: Session = Depends(get_db),
):
    return analytics_service.drilldown_kpi(db, current_user.company_id, kpi, filters)


@router.get("/dashboard/drilldown/category/{category_id}")
def get_dashboard_category_drilldown(
    category_id: str,
    filters: analytics_service.DashboardFilters = Depends(dashboard_filters),
    current_user: User = Depends(can_view_dashboard),
    db: Session = Depends(get_db),
):
    return analytics_service.drilldown_category(db, current_user.company_id, category_id, filters)


@router.get("/dashboard/drilldown/product/{product_id}")
def get_dashboard_product_drilldown(
    product_id: str,
    filters: analytics_service.DashboardFilters = Depends(dashboard_filters),
    current_user: User = Depends(can_view_dashboard),
    db: Session = Depends(get_db),
):
    return analytics_service.drilldown_product(db, current_user.company_id, product_id, filters)


@router.get("/dashboard/export/csv")
def export_dashboard_csv(
    request: Request,
    section: Literal["kpis", "sales", "inventory"] = Query(...),
    filters: analytics_service.DashboardFilters = Depends(dashboard_filters),
    current_user: User = Depends(can_view_dashboard),
    db: Session = Depends(get_db),
):
    content = analytics_service.build_csv(db, current_user.company_id, section, filters)
    write_audit_log(
        db,
        AuditAction.REPORT_EXPORTED,
        current_user.company_id,
        current_user.id,
        details=f"Dashboard {section} export (CSV)",
        entity_type=AuditEntityType.DASHBOARD,
        **request_meta(request),
    )
    db.commit()
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="dashboard-{section}.csv"'},
    )


@router.get("/dashboard/export/pdf")
def export_dashboard_pdf(
    request: Request,
    section: Literal["kpis", "sales", "inventory"] = Query(...),
    filters: analytics_service.DashboardFilters = Depends(dashboard_filters),
    current_user: User = Depends(can_view_dashboard),
    db: Session = Depends(get_db),
):
    content = analytics_service.build_pdf(db, current_user.company_id, section, filters)
    write_audit_log(
        db,
        AuditAction.REPORT_EXPORTED,
        current_user.company_id,
        current_user.id,
        details=f"Dashboard {section} export (PDF)",
        entity_type=AuditEntityType.DASHBOARD,
        **request_meta(request),
    )
    db.commit()
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="dashboard-{section}.pdf"'},
    )


@router.post("/dashboard/audit")
def log_dashboard_audit_event(
    payload: DashboardAuditRequest,
    request: Request,
    current_user: User = Depends(can_view_dashboard),
    db: Session = Depends(get_db),
):
    action = AuditAction.DASHBOARD_VIEWED if payload.action == "viewed" else AuditAction.DASHBOARD_FILTERS_APPLIED
    details = json.dumps(payload.filters) if payload.filters else None
    write_audit_log(
        db,
        action,
        current_user.company_id,
        current_user.id,
        details=details,
        entity_type=AuditEntityType.DASHBOARD,
        **request_meta(request),
    )
    db.commit()
    return {"status": "logged"}
