import json
from decimal import Decimal

from .models import (
    AuditLog,
    Category,
    Company,
    Customer,
    CustomerPurchaseSummary,
    Inventory,
    InventoryMovement,
    InventoryTransaction,
    Notification,
    Product,
    Sale,
    SaleItem,
    User,
)


def iso(value):
    return value.isoformat() if value else None


def number(value) -> float:
    return float(value) if isinstance(value, Decimal) else value


def serialize_company(company: Company) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "industry": company.industry,
        "email": company.email,
        "address": company.address,
        "phone": company.phone,
        "created_at": iso(company.created_at),
        "updated_at": iso(company.updated_at),
    }


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "company_id": user.company_id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "status": user.status.value,
        "last_login": iso(user.last_login),
        "created_at": iso(user.created_at),
    }


def serialize_category(category: Category, product_count: int | None = None) -> dict:
    return {
        "id": category.id,
        "company_id": category.company_id,
        "name": category.name,
        "description": category.description,
        "is_active": category.is_active,
        "product_count": product_count or 0,
        "created_at": iso(category.created_at),
        "updated_at": iso(category.updated_at),
    }


def serialize_product(product: Product) -> dict:
    return {
        "id": product.id,
        "company_id": product.company_id,
        "category_id": product.category_id,
        "category_name": product.category.name if product.category else None,
        "sku": product.sku,
        "name": product.name,
        "brand": product.brand,
        "description": product.description,
        "unit_price": number(product.unit_price),
        "cost_price": number(product.cost_price),
        "stock_quantity": product.stock_quantity,
        "reorder_level": product.reorder_level,
        "unit_of_measure": product.unit_of_measure,
        "is_active": product.is_active,
        "low_stock": product.stock_quantity <= product.reorder_level,
        "created_at": iso(product.created_at),
        "updated_at": iso(product.updated_at),
    }


def serialize_customer_summary(summary: CustomerPurchaseSummary | None) -> dict:
    if not summary:
        return {
            "total_orders": 0,
            "total_revenue": 0.0,
            "total_quantity": 0,
            "average_order_value": 0.0,
            "first_purchase_date": None,
            "last_purchase_date": None,
            "favorite_product_id": None,
            "favorite_product_name": None,
            "favorite_category_id": None,
            "favorite_category_name": None,
            "segment": "NEW",
        }
    return {
        "total_orders": summary.total_orders,
        "total_revenue": number(summary.total_revenue),
        "total_quantity": summary.total_quantity,
        "average_order_value": number(summary.average_order_value),
        "first_purchase_date": iso(summary.first_purchase_date),
        "last_purchase_date": iso(summary.last_purchase_date),
        "favorite_product_id": summary.favorite_product_id,
        "favorite_product_name": summary.favorite_product.name if summary.favorite_product else None,
        "favorite_category_id": summary.favorite_category_id,
        "favorite_category_name": summary.favorite_category.name if summary.favorite_category else None,
        "segment": summary.segment.value,
    }


def serialize_customer(customer: Customer) -> dict:
    return {
        "id": customer.id,
        "company_id": customer.company_id,
        "customer_code": customer.customer_code,
        "full_name": customer.full_name,
        "email": customer.email,
        "phone": customer.phone,
        "date_of_birth": customer.date_of_birth.isoformat() if customer.date_of_birth else None,
        "gender": customer.gender.value if customer.gender else None,
        "address": customer.address,
        "city": customer.city,
        "state": customer.state,
        "country": customer.country,
        "postal_code": customer.postal_code,
        "customer_type": customer.customer_type.value,
        "preferred_channel": customer.preferred_channel.value if customer.preferred_channel else None,
        "is_active": customer.is_active,
        "summary": serialize_customer_summary(customer.summary),
        "created_at": iso(customer.created_at),
        "updated_at": iso(customer.updated_at),
    }


def serialize_customer_profile(customer: Customer, recent_sales: list[Sale]) -> dict:
    profile = serialize_customer(customer)
    profile["recent_activity"] = [serialize_sale(sale) for sale in recent_sales]
    return profile


def serialize_timeline_entry(entry: dict) -> dict:
    return {
        "type": entry["type"],
        "details": entry["details"],
        "occurred_at": iso(entry["occurred_at"]),
        "performed_by": entry.get("performed_by"),
        "purchase_value": entry.get("purchase_value"),
    }


def serialize_inventory_transaction(transaction: InventoryTransaction) -> dict:
    return {
        "id": transaction.id,
        "product_id": transaction.product_id,
        "product_name": transaction.product.name if transaction.product else None,
        "type": transaction.type.value,
        "quantity": transaction.quantity,
        "note": transaction.note,
        "created_at": iso(transaction.created_at),
    }


def serialize_inventory(inventory: Inventory) -> dict:
    product = inventory.product
    return {
        "id": inventory.id,
        "company_id": inventory.company_id,
        "product_id": inventory.product_id,
        "product_name": product.name if product else None,
        "sku": product.sku if product else None,
        "category_id": product.category_id if product else None,
        "category_name": product.category.name if product and product.category else None,
        "brand": product.brand if product else None,
        "current_stock": inventory.current_stock,
        "reserved_stock": inventory.reserved_stock,
        "available_stock": inventory.available_stock,
        "reorder_level": inventory.reorder_level,
        "stock_status": inventory.stock_status.value,
        "updated_at": iso(inventory.updated_at),
    }


def serialize_inventory_movement(movement: InventoryMovement) -> dict:
    inventory = movement.inventory
    product = inventory.product if inventory else None
    return {
        "id": movement.id,
        "inventory_id": movement.inventory_id,
        "product_id": inventory.product_id if inventory else None,
        "product_name": product.name if product else None,
        "movement_type": movement.movement_type.value,
        "quantity_changed": movement.quantity_changed,
        "previous_quantity": movement.previous_quantity,
        "updated_quantity": movement.updated_quantity,
        "reason": movement.reason,
        "remarks": movement.remarks,
        "performed_by": movement.performed_by,
        "performed_by_name": movement.performer.name if movement.performer else None,
        "created_at": iso(movement.created_at),
    }


def serialize_notification(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "product_id": notification.product_id,
        "product_name": notification.product.name if notification.product else None,
        "customer_id": notification.customer_id,
        "customer_name": notification.customer.full_name if notification.customer else None,
        "title": notification.title,
        "message": notification.message,
        "is_read": notification.is_read,
        "created_at": iso(notification.created_at),
    }


def serialize_sale_item(item: SaleItem) -> dict:
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product_name": item.product.name if item.product else None,
        "category_id": item.category_id,
        "category_name": item.category.name if item.category else item.product.category.name if item.product and item.product.category else None,
        "quantity": item.quantity,
        "unit_price": number(item.unit_price),
        "discount": number(item.discount),
        "tax": number(item.tax),
        "subtotal": number(item.subtotal),
        "total": number(item.total),
        "remaining_stock": item.product.stock_quantity if item.product else None,
    }


def serialize_audit_log(log: AuditLog, customer_name: str | None = None) -> dict:
    def decode(value: str | None):
        if not value:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    return {
        "id": log.id,
        "company_id": log.company_id,
        "customer_id": log.entity_id if log.entity_type and log.entity_type.value == "CUSTOMER" else None,
        "customer_name": customer_name,
        "user_id": log.user_id,
        "performed_by": log.user.name if log.user else None,
        "action": log.action.value,
        "entity_type": log.entity_type.value if log.entity_type else None,
        "entity_id": log.entity_id,
        "details": log.details,
        "previous_values": decode(log.previous_values),
        "new_values": decode(log.new_values),
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "created_at": iso(log.created_at),
    }


def serialize_sale(sale: Sale) -> dict:
    return {
        "id": sale.id,
        "company_id": sale.company_id,
        "user_id": sale.user_id,
        "created_by": sale.user_id,
        "cashier_name": sale.user.name if sale.user else None,
        "invoice_number": sale.invoice_number,
        "customer_id": sale.customer_id,
        "customer_name": sale.customer_name,
        "sale_date": iso(sale.sale_date),
        "sales_channel": sale.sales_channel.value,
        "payment_method": sale.payment_method.value,
        "status": sale.status.value,
        "total_amount": number(sale.total_amount),
        "items": [serialize_sale_item(item) for item in sale.items],
        "created_at": iso(sale.created_at),
        "updated_at": iso(sale.updated_at),
    }
