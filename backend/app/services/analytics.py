import csv
import io
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from ..models import Category, Customer, PaymentMethod, Product, Sale, SaleItem, SalesChannel, SaleStatus
from . import customer as customer_service
from .product import low_stock_products


@dataclass
class DashboardFilters:
    date_from: datetime | None = None
    date_to: datetime | None = None
    product_id: str | None = None
    category_id: str | None = None
    brand: str | None = None
    sales_channel: SalesChannel | None = None
    payment_method: PaymentMethod | None = None


KPI_KEYS = {
    "revenue",
    "orders",
    "products_sold",
    "average_order_value",
    "inventory_value",
    "low_stock",
    "out_of_stock",
    "categories",
}

EXPORT_SECTIONS = {"kpis", "sales", "inventory"}


# ---------------------------------------------------------------------------
# Query building
# ---------------------------------------------------------------------------

def _sale_items_stmt(company_id: str, filters: DashboardFilters):
    stmt = (
        select(SaleItem)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .join(Product, Product.id == SaleItem.product_id)
        .where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
    )
    if filters.date_from:
        stmt = stmt.where(Sale.sale_date >= filters.date_from)
    if filters.date_to:
        stmt = stmt.where(Sale.sale_date <= filters.date_to)
    if filters.product_id:
        stmt = stmt.where(SaleItem.product_id == filters.product_id)
    if filters.category_id:
        stmt = stmt.where(SaleItem.category_id == filters.category_id)
    if filters.brand:
        stmt = stmt.where(Product.brand == filters.brand)
    if filters.sales_channel:
        stmt = stmt.where(Sale.sales_channel == filters.sales_channel)
    if filters.payment_method:
        stmt = stmt.where(Sale.payment_method == filters.payment_method)
    return stmt


def _products_stmt(company_id: str, filters: DashboardFilters):
    stmt = select(Product).where(Product.company_id == company_id)
    if filters.category_id:
        stmt = stmt.where(Product.category_id == filters.category_id)
    if filters.brand:
        stmt = stmt.where(Product.brand == filters.brand)
    if filters.product_id:
        stmt = stmt.where(Product.id == filters.product_id)
    return stmt


def _bucket_key(when: datetime, granularity: str) -> str:
    day = when.date() if isinstance(when, datetime) else when
    if granularity == "monthly":
        return day.replace(day=1).isoformat()
    if granularity == "weekly":
        return (day - timedelta(days=day.weekday())).isoformat()
    return day.isoformat()


# ---------------------------------------------------------------------------
# Legacy simple-dashboard endpoints (used by the plain /dashboard landing page,
# visible to all roles including VIEWER). Kept separate from the filtered
# Retail Analytics Dashboard functions below.
# ---------------------------------------------------------------------------

def get_summary(db: Session, company_id: str) -> dict:
    total_revenue = db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
    )
    total_orders = db.scalar(select(func.count(Sale.id)).where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED))
    total_customers = db.scalar(select(func.count(Customer.id)).where(Customer.company_id == company_id))
    low_stock_count = len(low_stock_products(db, company_id))

    total_products = db.scalar(select(func.count(Product.id)).where(Product.company_id == company_id)) or 0
    active_products = db.scalar(
        select(func.count(Product.id)).where(Product.company_id == company_id, Product.is_active.is_(True))
    ) or 0
    total_categories = db.scalar(select(func.count(Category.id)).where(Category.company_id == company_id)) or 0

    return {
        "total_revenue": float(total_revenue or 0),
        "total_orders": total_orders or 0,
        "total_customers": total_customers or 0,
        "low_stock_count": low_stock_count,
        "total_products": total_products,
        "active_products": active_products,
        "inactive_products": total_products - active_products,
        "total_categories": total_categories,
    }


def get_revenue_over_time(db: Session, company_id: str, days: int = 30) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    sales = db.scalars(
        select(Sale).where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED, Sale.created_at >= since)
    ).all()

    buckets: dict[str, float] = {}
    for sale in sales:
        day = sale.created_at.date().isoformat()
        buckets[day] = buckets.get(day, 0) + float(sale.total_amount)

    return [{"date": day, "revenue": buckets[day]} for day in sorted(buckets)]


def get_top_products(db: Session, company_id: str, limit: int = 5) -> list[dict]:
    rows = db.execute(
        select(SaleItem.product_id, func.sum(SaleItem.quantity), func.sum(SaleItem.subtotal))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
        .group_by(SaleItem.product_id)
        .order_by(desc(func.sum(SaleItem.quantity)))
        .limit(limit)
    ).all()

    product_ids = [row[0] for row in rows]
    names = {}
    if product_ids:
        for product_id, name in db.execute(select(Product.id, Product.name).where(Product.id.in_(product_ids))):
            names[product_id] = name

    return [
        {
            "product_id": row[0],
            "product_name": names.get(row[0], "Unknown"),
            "units_sold": int(row[1] or 0),
            "revenue": float(row[2] or 0),
        }
        for row in rows
    ]


def get_sales_by_category(db: Session, company_id: str) -> list[dict]:
    rows = db.execute(
        select(func.coalesce(Category.name, "Uncategorized"), func.sum(SaleItem.subtotal))
        .join(Product, Product.id == SaleItem.product_id)
        .outerjoin(Category, Category.id == Product.category_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.company_id == company_id, Sale.status == SaleStatus.COMPLETED)
        .group_by(Category.name)
    ).all()
    return [{"category": row[0], "revenue": float(row[1] or 0)} for row in rows]


# ---------------------------------------------------------------------------
# KPI cards
# ---------------------------------------------------------------------------

def get_kpis(db: Session, company_id: str, filters: DashboardFilters) -> dict:
    item_stmt = _sale_items_stmt(company_id, filters)
    total_revenue, total_units, order_count = db.execute(
        item_stmt.with_only_columns(
            func.coalesce(func.sum(SaleItem.total), 0),
            func.coalesce(func.sum(SaleItem.quantity), 0),
            func.count(func.distinct(SaleItem.sale_id)),
        )
    ).one()

    product_stmt = _products_stmt(company_id, filters)
    inventory_value = db.scalar(
        product_stmt.with_only_columns(func.coalesce(func.sum(Product.cost_price * Product.stock_quantity), 0))
    )
    low_stock = db.scalar(
        product_stmt.where(Product.stock_quantity > 0, Product.stock_quantity <= Product.reorder_level).with_only_columns(func.count())
    )
    out_of_stock = db.scalar(
        product_stmt.where(Product.stock_quantity <= 0).with_only_columns(func.count())
    )
    categories = db.scalar(
        product_stmt.with_only_columns(func.count(func.distinct(Product.category_id)))
    )

    total_revenue = float(total_revenue or 0)
    order_count = order_count or 0

    return {
        "totalRevenue": total_revenue,
        "totalOrders": order_count,
        "totalProductsSold": int(total_units or 0),
        "averageOrderValue": (total_revenue / order_count) if order_count else 0.0,
        "totalInventoryValue": float(inventory_value or 0),
        "lowStockProducts": low_stock or 0,
        "outOfStockProducts": out_of_stock or 0,
        "totalCategories": categories or 0,
    }


# ---------------------------------------------------------------------------
# Sales analytics
# ---------------------------------------------------------------------------

def get_revenue_trend(db: Session, company_id: str, filters: DashboardFilters, granularity: str = "daily") -> list[dict]:
    stmt = _sale_items_stmt(company_id, filters).with_only_columns(Sale.sale_date, SaleItem.total)
    buckets: dict[str, float] = {}
    for sale_date, item_total in db.execute(stmt):
        key = _bucket_key(sale_date, granularity)
        buckets[key] = buckets.get(key, 0) + float(item_total)
    return [{"period": key, "revenue": buckets[key]} for key in sorted(buckets)]


def get_sales_trend(db: Session, company_id: str, filters: DashboardFilters, granularity: str = "daily") -> list[dict]:
    stmt = _sale_items_stmt(company_id, filters).with_only_columns(Sale.sale_date, SaleItem.sale_id, SaleItem.quantity)
    orders_by_bucket: dict[str, set] = {}
    units_by_bucket: dict[str, int] = {}
    for sale_date, sale_id, quantity in db.execute(stmt):
        key = _bucket_key(sale_date, granularity)
        orders_by_bucket.setdefault(key, set()).add(sale_id)
        units_by_bucket[key] = units_by_bucket.get(key, 0) + int(quantity)
    return [
        {"period": key, "orders": len(orders_by_bucket[key]), "unitsSold": units_by_bucket.get(key, 0)}
        for key in sorted(orders_by_bucket)
    ]


def get_top_selling_products(db: Session, company_id: str, filters: DashboardFilters, limit: int = 10) -> list[dict]:
    stmt = (
        _sale_items_stmt(company_id, filters)
        .with_only_columns(SaleItem.product_id, func.sum(SaleItem.quantity), func.sum(SaleItem.total))
        .group_by(SaleItem.product_id)
        .order_by(desc(func.sum(SaleItem.quantity)))
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    product_ids = [row[0] for row in rows]
    names: dict[str, str] = {}
    if product_ids:
        for product_id, name in db.execute(select(Product.id, Product.name).where(Product.id.in_(product_ids))):
            names[product_id] = name

    return [
        {
            "productId": row[0],
            "productName": names.get(row[0], "Unknown"),
            "unitsSold": int(row[1] or 0),
            "revenue": float(row[2] or 0),
        }
        for row in rows
    ]


def get_top_categories(db: Session, company_id: str, filters: DashboardFilters, limit: int = 10) -> list[dict]:
    stmt = (
        _sale_items_stmt(company_id, filters)
        .join(Category, Category.id == SaleItem.category_id, isouter=True)
        .with_only_columns(func.coalesce(Category.name, "Uncategorized"), func.sum(SaleItem.total), func.sum(SaleItem.quantity))
        .group_by(Category.name)
        .order_by(desc(func.sum(SaleItem.total)))
        .limit(limit)
    )
    return [
        {"category": row[0], "revenue": float(row[1] or 0), "unitsSold": int(row[2] or 0)} for row in db.execute(stmt)
    ]


def get_sales_by_payment_method(db: Session, company_id: str, filters: DashboardFilters) -> list[dict]:
    stmt = (
        _sale_items_stmt(company_id, filters)
        .with_only_columns(Sale.payment_method, func.sum(SaleItem.total))
        .group_by(Sale.payment_method)
        .order_by(desc(func.sum(SaleItem.total)))
    )
    return [{"paymentMethod": row[0].value, "revenue": float(row[1] or 0)} for row in db.execute(stmt)]


def get_sales_by_channel(db: Session, company_id: str, filters: DashboardFilters) -> list[dict]:
    stmt = (
        _sale_items_stmt(company_id, filters)
        .with_only_columns(Sale.sales_channel, func.sum(SaleItem.total))
        .group_by(Sale.sales_channel)
        .order_by(desc(func.sum(SaleItem.total)))
    )
    return [{"salesChannel": row[0].value, "revenue": float(row[1] or 0)} for row in db.execute(stmt)]


# ---------------------------------------------------------------------------
# Inventory analytics
# ---------------------------------------------------------------------------

def get_inventory_distribution_by_category(db: Session, company_id: str, filters: DashboardFilters) -> list[dict]:
    stmt = (
        _products_stmt(company_id, filters)
        .join(Category, Category.id == Product.category_id, isouter=True)
        .with_only_columns(func.coalesce(Category.name, "Uncategorized"), func.count(Product.id), func.sum(Product.stock_quantity))
        .group_by(Category.name)
        .order_by(desc(func.count(Product.id)))
    )
    return [
        {"category": row[0], "productCount": row[1] or 0, "totalStock": int(row[2] or 0)} for row in db.execute(stmt)
    ]


def get_stock_status_summary(db: Session, company_id: str, filters: DashboardFilters) -> dict:
    products = db.scalars(_products_stmt(company_id, filters)).all()
    in_stock = sum(1 for p in products if p.stock_quantity > p.reorder_level)
    low_stock = sum(1 for p in products if 0 < p.stock_quantity <= p.reorder_level)
    out_of_stock = sum(1 for p in products if p.stock_quantity <= 0)
    return {"inStock": in_stock, "lowStock": low_stock, "outOfStock": out_of_stock}


def get_top_low_stock_products(db: Session, company_id: str, filters: DashboardFilters, limit: int = 10) -> list[dict]:
    stmt = (
        _products_stmt(company_id, filters)
        .options(joinedload(Product.category))
        .where(Product.stock_quantity > 0, Product.stock_quantity <= Product.reorder_level)
        .order_by(Product.stock_quantity.asc())
        .limit(limit)
    )
    return [_serialize_product(product) for product in db.scalars(stmt).all()]


def get_out_of_stock_products(db: Session, company_id: str, filters: DashboardFilters, limit: int = 50) -> list[dict]:
    stmt = (
        _products_stmt(company_id, filters)
        .options(joinedload(Product.category))
        .where(Product.stock_quantity <= 0)
        .order_by(Product.updated_at.desc())
        .limit(limit)
    )
    return [_serialize_product(product) for product in db.scalars(stmt).all()]


def get_inventory_value_by_category(db: Session, company_id: str, filters: DashboardFilters) -> list[dict]:
    stmt = (
        _products_stmt(company_id, filters)
        .join(Category, Category.id == Product.category_id, isouter=True)
        .with_only_columns(func.coalesce(Category.name, "Uncategorized"), func.sum(Product.cost_price * Product.stock_quantity))
        .group_by(Category.name)
        .order_by(desc(func.sum(Product.cost_price * Product.stock_quantity)))
    )
    return [{"category": row[0], "inventoryValue": float(row[1] or 0)} for row in db.execute(stmt)]


def _serialize_product(product: Product) -> dict:
    return {
        "productId": product.id,
        "sku": product.sku,
        "name": product.name,
        "categoryName": product.category.name if product.category else None,
        "brand": product.brand,
        "stockQuantity": product.stock_quantity,
        "reorderLevel": product.reorder_level,
        "unitPrice": float(product.unit_price),
        "costPrice": float(product.cost_price),
    }


# ---------------------------------------------------------------------------
# Filters & overview
# ---------------------------------------------------------------------------

def get_filter_options(db: Session, company_id: str) -> dict:
    products = db.execute(
        select(Product.id, Product.name, Product.sku).where(Product.company_id == company_id).order_by(Product.name)
    ).all()
    categories = db.execute(
        select(Category.id, Category.name).where(Category.company_id == company_id).order_by(Category.name)
    ).all()
    brands = db.scalars(
        select(Product.brand)
        .where(Product.company_id == company_id, Product.brand.is_not(None), Product.brand != "")
        .distinct()
        .order_by(Product.brand.asc())
    ).all()

    return {
        "products": [{"id": row[0], "name": row[1], "sku": row[2]} for row in products],
        "categories": [{"id": row[0], "name": row[1]} for row in categories],
        "brands": list(brands),
        "salesChannels": [channel.value for channel in SalesChannel],
        "paymentMethods": [method.value for method in PaymentMethod],
    }


def get_customer_insights(db: Session, company_id: str) -> dict:
    overview = customer_service.customer_analytics_overview(db, company_id, customer_service.CustomerAnalyticsFilters())
    recent_customers = db.scalars(
        select(Customer).where(Customer.company_id == company_id).order_by(desc(Customer.created_at)).limit(5)
    ).all()
    return {
        "topCustomers": overview["topCustomers"],
        "recentCustomers": [
            {
                "customerId": c.id,
                "customerCode": c.customer_code,
                "name": c.full_name,
                "customerType": c.customer_type.value,
                "createdAt": c.created_at.isoformat(),
            }
            for c in recent_customers
        ],
        "customerGrowth": overview["growthTrend"],
        "customerRevenueContribution": overview["revenueByType"],
    }


def get_overview(db: Session, company_id: str, filters: DashboardFilters, granularity: str = "daily") -> dict:
    return {
        "kpis": get_kpis(db, company_id, filters),
        "sales": {
            "revenueTrend": get_revenue_trend(db, company_id, filters, granularity),
            "salesTrend": get_sales_trend(db, company_id, filters, granularity),
            "topProducts": get_top_selling_products(db, company_id, filters, 10),
            "topCategories": get_top_categories(db, company_id, filters, 10),
            "byPaymentMethod": get_sales_by_payment_method(db, company_id, filters),
            "byChannel": get_sales_by_channel(db, company_id, filters),
        },
        "inventory": {
            "distributionByCategory": get_inventory_distribution_by_category(db, company_id, filters),
            "stockStatusSummary": get_stock_status_summary(db, company_id, filters),
            "topLowStock": get_top_low_stock_products(db, company_id, filters, 10),
            "outOfStock": get_out_of_stock_products(db, company_id, filters, 50),
            "valueByCategory": get_inventory_value_by_category(db, company_id, filters),
        },
        "customers": get_customer_insights(db, company_id),
    }


# ---------------------------------------------------------------------------
# Drill-down
# ---------------------------------------------------------------------------

def _serialize_sale_row(sale_date, sale_id, invoice_number, customer_name, channel, payment_method, item_total, quantity) -> dict:
    return {
        "saleId": sale_id,
        "invoiceNumber": invoice_number,
        "date": sale_date.isoformat(),
        "customerName": customer_name or "Walk-in",
        "salesChannel": channel.value,
        "paymentMethod": payment_method.value,
        "amount": float(item_total),
        "quantity": int(quantity),
    }


def drilldown_kpi(db: Session, company_id: str, kpi: str, filters: DashboardFilters, limit: int = 200) -> dict:
    if kpi not in KPI_KEYS:
        raise HTTPException(404, "Unknown KPI")

    if kpi in {"revenue", "orders", "average_order_value", "products_sold"}:
        stmt = (
            _sale_items_stmt(company_id, filters)
            .with_only_columns(
                Sale.sale_date,
                Sale.id,
                Sale.invoice_number,
                Sale.customer_name,
                Sale.sales_channel,
                Sale.payment_method,
                SaleItem.total,
                SaleItem.quantity,
            )
            .order_by(desc(Sale.sale_date))
            .limit(limit)
        )
        rows = [_serialize_sale_row(*row) for row in db.execute(stmt)]
        return {"kpi": kpi, "type": "sales", "rows": rows}

    if kpi == "inventory_value":
        products = db.scalars(_products_stmt(company_id, filters).options(joinedload(Product.category)).order_by(desc(Product.cost_price * Product.stock_quantity)).limit(limit)).all()
        return {"kpi": kpi, "type": "products", "rows": [_serialize_product(p) for p in products]}

    if kpi == "low_stock":
        return {"kpi": kpi, "type": "products", "rows": get_top_low_stock_products(db, company_id, filters, limit)}

    if kpi == "out_of_stock":
        return {"kpi": kpi, "type": "products", "rows": get_out_of_stock_products(db, company_id, filters, limit)}

    if kpi == "categories":
        stmt = (
            select(Category.id, Category.name, func.count(Product.id))
            .outerjoin(Product, Product.category_id == Category.id)
            .where(Category.company_id == company_id)
            .group_by(Category.id)
            .order_by(Category.name)
            .limit(limit)
        )
        rows = [{"categoryId": row[0], "categoryName": row[1], "productCount": row[2] or 0} for row in db.execute(stmt)]
        return {"kpi": kpi, "type": "categories", "rows": rows}

    raise HTTPException(404, "Unknown KPI")


def drilldown_category(db: Session, company_id: str, category_id: str, filters: DashboardFilters) -> dict:
    category = db.scalar(select(Category).where(Category.id == category_id, Category.company_id == company_id))
    if not category:
        raise HTTPException(404, "Category not found")

    scoped = DashboardFilters(**{**filters.__dict__, "category_id": category_id})
    stmt = (
        _sale_items_stmt(company_id, scoped)
        .with_only_columns(SaleItem.product_id, func.sum(SaleItem.quantity), func.sum(SaleItem.total))
        .group_by(SaleItem.product_id)
        .order_by(desc(func.sum(SaleItem.total)))
    )
    sales_by_product = {row[0]: {"unitsSold": int(row[1] or 0), "revenue": float(row[2] or 0)} for row in db.execute(stmt)}

    products = db.scalars(select(Product).where(Product.company_id == company_id, Product.category_id == category_id)).all()
    rows = [
        {
            "productId": product.id,
            "sku": product.sku,
            "name": product.name,
            "stockQuantity": product.stock_quantity,
            "unitsSold": sales_by_product.get(product.id, {}).get("unitsSold", 0),
            "revenue": sales_by_product.get(product.id, {}).get("revenue", 0.0),
        }
        for product in products
    ]
    return {"categoryId": category_id, "categoryName": category.name, "rows": rows}


def drilldown_product(db: Session, company_id: str, product_id: str, filters: DashboardFilters, limit: int = 200) -> dict:
    product = db.scalar(select(Product).where(Product.id == product_id, Product.company_id == company_id))
    if not product:
        raise HTTPException(404, "Product not found")

    scoped = DashboardFilters(**{**filters.__dict__, "product_id": product_id})
    stmt = (
        _sale_items_stmt(company_id, scoped)
        .with_only_columns(
            Sale.sale_date,
            Sale.id,
            Sale.invoice_number,
            Sale.customer_name,
            Sale.sales_channel,
            Sale.payment_method,
            SaleItem.total,
            SaleItem.quantity,
        )
        .order_by(desc(Sale.sale_date))
        .limit(limit)
    )
    rows = [_serialize_sale_row(*row) for row in db.execute(stmt)]
    return {"productId": product_id, "productName": product.name, "rows": rows}


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def _export_rows(db: Session, company_id: str, section: str, filters: DashboardFilters) -> tuple[list[str], list[list]]:
    if section == "kpis":
        kpis = get_kpis(db, company_id, filters)
        headers = list(kpis.keys())
        return headers, [[kpis[header] for header in headers]]

    if section == "sales":
        stmt = (
            _sale_items_stmt(company_id, filters)
            .with_only_columns(
                Sale.invoice_number, Sale.sale_date, Sale.customer_name, Sale.sales_channel, Sale.payment_method,
                Product.name, SaleItem.quantity, SaleItem.total,
            )
            .order_by(desc(Sale.sale_date))
            .limit(5000)
        )
        headers = ["Invoice", "Date", "Customer", "Channel", "Payment Method", "Product", "Quantity", "Amount"]
        rows = [
            [invoice, sale_date.isoformat(), customer or "Walk-in", channel.value, payment.value, product_name, quantity, float(amount)]
            for invoice, sale_date, customer, channel, payment, product_name, quantity, amount in db.execute(stmt)
        ]
        return headers, rows

    if section == "inventory":
        products = db.scalars(_products_stmt(company_id, filters).options(joinedload(Product.category)).order_by(Product.name)).all()
        headers = ["SKU", "Name", "Category", "Brand", "Stock Quantity", "Reorder Level", "Unit Price", "Cost Price", "Inventory Value"]
        rows = [
            [
                p.sku, p.name, p.category.name if p.category else "Uncategorized", p.brand or "",
                p.stock_quantity, p.reorder_level, float(p.unit_price), float(p.cost_price),
                float(p.cost_price) * p.stock_quantity,
            ]
            for p in products
        ]
        return headers, rows

    raise HTTPException(400, "Unknown export section")


def build_csv(db: Session, company_id: str, section: str, filters: DashboardFilters) -> str:
    headers, rows = _export_rows(db, company_id, section, filters)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue()


def build_pdf(db: Session, company_id: str, section: str, filters: DashboardFilters) -> bytes:
    from fpdf import FPDF

    headers, rows = _export_rows(db, company_id, section, filters)

    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"RetailPulse - {section.capitalize()} Report", new_x="LMARGIN", new_y="NEXT")
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
