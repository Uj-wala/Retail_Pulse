from decimal import Decimal

from .models import Category, Company, InventoryTransaction, Product, Sale, SaleItem, User


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


def serialize_category(category: Category) -> dict:
    return {
        "id": category.id,
        "company_id": category.company_id,
        "name": category.name,
        "description": category.description,
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
        "description": product.description,
        "price": number(product.price),
        "cost": number(product.cost),
        "stock_quantity": product.stock_quantity,
        "reorder_level": product.reorder_level,
        "is_active": product.is_active,
        "low_stock": product.stock_quantity <= product.reorder_level,
        "created_at": iso(product.created_at),
        "updated_at": iso(product.updated_at),
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


def serialize_sale_item(item: SaleItem) -> dict:
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product_name": item.product.name if item.product else None,
        "quantity": item.quantity,
        "unit_price": number(item.unit_price),
        "subtotal": number(item.subtotal),
    }


def serialize_sale(sale: Sale) -> dict:
    return {
        "id": sale.id,
        "company_id": sale.company_id,
        "user_id": sale.user_id,
        "cashier_name": sale.user.name if sale.user else None,
        "customer_name": sale.customer_name,
        "status": sale.status.value,
        "total_amount": number(sale.total_amount),
        "items": [serialize_sale_item(item) for item in sale.items],
        "created_at": iso(sale.created_at),
    }
