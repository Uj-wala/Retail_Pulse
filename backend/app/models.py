import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

def uuid_str() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    COMPANY_ADMIN = "COMPANY_ADMIN"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class AuditAction(str, enum.Enum):
    COMPANY_REGISTERED = "COMPANY_REGISTERED"
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    LOGIN_FAILED = "LOGIN_FAILED"
    USER_INVITED = "USER_INVITED"
    USER_UPDATED = "USER_UPDATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED"
    PRODUCT_CREATED = "PRODUCT_CREATED"
    PRODUCT_UPDATED = "PRODUCT_UPDATED"
    PRODUCT_DELETED = "PRODUCT_DELETED"
    PRODUCT_ACTIVATED = "PRODUCT_ACTIVATED"
    PRODUCT_DEACTIVATED = "PRODUCT_DEACTIVATED"
    CATEGORY_CREATED = "CATEGORY_CREATED"
    CATEGORY_UPDATED = "CATEGORY_UPDATED"
    CATEGORY_DELETED = "CATEGORY_DELETED"
    INVENTORY_ADJUSTED = "INVENTORY_ADJUSTED"
    INVENTORY_UPDATED = "INVENTORY_UPDATED"
    SALE_CREATED = "SALE_CREATED"
    SALE_UPDATED = "SALE_UPDATED"
    SALE_DELETED = "SALE_DELETED"
    SALE_REFUNDED = "SALE_REFUNDED"
    PRODUCT_MARKED_OUT_OF_STOCK = "PRODUCT_MARKED_OUT_OF_STOCK"
    COMPANY_UPDATED = "COMPANY_UPDATED"
    STOCK_ADDED = "STOCK_ADDED"
    STOCK_REMOVED = "STOCK_REMOVED"
    STOCK_ADJUSTED = "STOCK_ADJUSTED"
    REORDER_LEVEL_UPDATED = "REORDER_LEVEL_UPDATED"
    PRODUCT_LOW_STOCK = "PRODUCT_LOW_STOCK"
    PRODUCT_OUT_OF_STOCK = "PRODUCT_OUT_OF_STOCK"
    DASHBOARD_VIEWED = "DASHBOARD_VIEWED"
    DASHBOARD_FILTERS_APPLIED = "DASHBOARD_FILTERS_APPLIED"
    REPORT_EXPORTED = "REPORT_EXPORTED"


class InventoryTransactionType(str, enum.Enum):
    RESTOCK = "RESTOCK"
    SALE = "SALE"
    ADJUSTMENT = "ADJUSTMENT"
    RETURN = "RETURN"


class StockStatus(str, enum.Enum):
    IN_STOCK = "IN_STOCK"
    LOW_STOCK = "LOW_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class InventoryMovementType(str, enum.Enum):
    SALE = "SALE"
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"
    STOCK_ADDITION = "STOCK_ADDITION"
    STOCK_REMOVAL = "STOCK_REMOVAL"


class SaleStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class SalesChannel(str, enum.Enum):
    RETAIL_STORE = "RETAIL_STORE"
    ONLINE_STORE = "ONLINE_STORE"
    MARKETPLACE = "MARKETPLACE"


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CARD = "CARD"
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"


class AuditEntityType(str, enum.Enum):
    COMPANY = "COMPANY"
    USER = "USER"
    CATEGORY = "CATEGORY"
    PRODUCT = "PRODUCT"
    INVENTORY = "INVENTORY"
    SALE = "SALE"
    REPORT = "REPORT"
    DASHBOARD = "DASHBOARD"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String, nullable=False)
    industry: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="company")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_company_id", "company_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="UserRole"), default=UserRole.VIEWER, nullable=False)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus, name="UserStatus"), default=UserStatus.ACTIVE, nullable=False)
    last_login: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    company: Mapped[Company] = relationship(back_populates="users")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (Index("ix_refresh_tokens_user_id", "user_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship()


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    __table_args__ = (Index("ix_password_reset_tokens_user_id", "user_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship()


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("company_id", "name"), Index("ix_categories_company_id", "company_id"))

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("company_id", "sku"),
        UniqueConstraint("company_id", "category_id", "name"),
        Index("ix_products_company_id", "company_id"),
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_sku", "sku"),
        Index("ix_products_is_active", "is_active"),
        Index("ix_products_brand", "brand"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    category_id: Mapped[str] = mapped_column(String, ForeignKey("categories.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    brand: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(default=0, nullable=False)
    reorder_level: Mapped[int] = mapped_column(default=10, nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String, default="unit", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    category: Mapped[Category] = relationship()


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    __table_args__ = (
        Index("ix_inventory_transactions_company_id_created_at", "company_id", "created_at"),
        Index("ix_inventory_transactions_product_id", "product_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    company_id: Mapped[str] = mapped_column(String, nullable=False)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id"), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    type: Mapped[InventoryTransactionType] = mapped_column(Enum(InventoryTransactionType, name="InventoryTransactionType"), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)

    product: Mapped[Product] = relationship()
    user: Mapped[User | None] = relationship()


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("product_id"),
        Index("ix_inventory_company_id_stock_status", "company_id", "stock_status"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id"), nullable=False)
    current_stock: Mapped[int] = mapped_column(default=0, nullable=False)
    reserved_stock: Mapped[int] = mapped_column(default=0, nullable=False)
    available_stock: Mapped[int] = mapped_column(default=0, nullable=False)
    reorder_level: Mapped[int] = mapped_column(default=10, nullable=False)
    stock_status: Mapped[StockStatus] = mapped_column(Enum(StockStatus, name="StockStatus"), default=StockStatus.OUT_OF_STOCK, nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    product: Mapped[Product] = relationship()
    movements: Mapped[list["InventoryMovement"]] = relationship(back_populates="inventory", cascade="all, delete-orphan")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (Index("ix_inventory_movements_inventory_id_created_at", "inventory_id", "created_at"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    inventory_id: Mapped[str] = mapped_column(String, ForeignKey("inventory.id"), nullable=False)
    movement_type: Mapped[InventoryMovementType] = mapped_column(Enum(InventoryMovementType, name="InventoryMovementType"), nullable=False)
    quantity_changed: Mapped[int] = mapped_column(nullable=False)
    previous_quantity: Mapped[int] = mapped_column(nullable=False)
    updated_quantity: Mapped[int] = mapped_column(nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)

    inventory: Mapped[Inventory] = relationship(back_populates="movements")
    performer: Mapped[User | None] = relationship()


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint("company_id", "invoice_number"),
        Index("ix_sales_company_id_created_at", "company_id", "created_at"),
        Index("ix_sales_company_id_sale_date", "company_id", "sale_date"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String, nullable=False)
    # Intentionally optional: supports anonymous/walk-in retail customers who don't provide a name.
    customer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    sale_date: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    sales_channel: Mapped[SalesChannel] = mapped_column(Enum(SalesChannel, name="SalesChannel"), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, name="PaymentMethod"), nullable=False)
    status: Mapped[SaleStatus] = mapped_column(Enum(SaleStatus, name="SaleStatus"), default=SaleStatus.COMPLETED, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship()
    items: Mapped[list["SaleItem"]] = relationship(cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        Index("ix_sale_items_sale_id", "sale_id"),
        Index("ix_sale_items_product_id", "product_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    sale_id: Mapped[str] = mapped_column(String, ForeignKey("sales.id"), nullable=False)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id"), nullable=False)
    category_id: Mapped[str | None] = mapped_column(String, ForeignKey("categories.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    tax: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    product: Mapped[Product] = relationship()
    category: Mapped[Category | None] = relationship()


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_company_id_created_at", "company_id", "created_at"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"), nullable=False)
    product_id: Mapped[str | None] = mapped_column(String, ForeignKey("products.id"), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)

    product: Mapped[Product | None] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_logs_company_id_created_at", "company_id", "created_at"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    company_id: Mapped[str | None] = mapped_column(String, ForeignKey("companies.id"), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction, name="AuditAction"), nullable=False)
    entity_type: Mapped[AuditEntityType | None] = mapped_column(Enum(AuditEntityType, name="AuditEntityType"), nullable=True)
    details: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=utcnow)
