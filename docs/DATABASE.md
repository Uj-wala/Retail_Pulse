# Database Schema

PostgreSQL via SQLAlchemy. Full schema source: [`backend/app/models.py`](../backend/app/models.py).

## Entity Overview

| Model | Purpose |
| --- | --- |
| `Company` | A tenant. Every other business entity belongs to exactly one company. |
| `User` | A person who can log in. Belongs to a company, has a `role` and `status`. |
| `RefreshToken` | Hashed, rotating refresh tokens for a user's session. |
| `Category` | Groups products within a company. Unique `(company_id, name)`. |
| `Product` | Catalog item: SKU, unitPrice, costPrice, stock quantity, reorder level. Unique `(company_id, sku)`. Every product must belong to a category. |
| `Inventory` | One row per product: current/reserved/available stock, its own (independent) reorder level, and a computed stock status. The operational source of truth for the Inventory module. |
| `InventoryMovement` | An immutable log of stock movement against an `Inventory` record (`SALE`, `STOCK_ADDITION`, `STOCK_REMOVAL`, `MANUAL_ADJUSTMENT`), with previous/updated quantity, reason, remarks, and who performed it. |
| `InventoryTransaction` | Legacy stock-movement log, superseded by `InventoryMovement`. No longer written to; kept only so historical rows aren't lost. |
| `Notification` | Company-wide alert (low stock, out of stock, manual stock adjustment), surfaced to Company Admins via `GET /notifications`. |
| `Sale` | A point-of-sale transaction with a status (`COMPLETED`, `REFUNDED`, `CANCELLED`) and total. |
| `SaleItem` | A line item on a sale: product, quantity, unit price at time of sale, subtotal. |
| `AuditLog` | Append-only record of security-relevant and business events. |

## Relationships

```
Company 1---* User
Company 1---* Category
Company 1---* Product
Company 1---* Sale
Company 1---* AuditLog

Category 1---* Product   (mandatory: every Product must belong to exactly one Category)

Product 1---1 Inventory
Product 1---* SaleItem
Product 1---* InventoryTransaction  (legacy, unused)

Inventory 1---* InventoryMovement

Sale 1---* SaleItem
Sale *---1 User            (the cashier who recorded it)

User 1---* RefreshToken
User 1---* AuditLog
User 1---* InventoryMovement  (performed_by)
```

## Enums

- **UserRole:** `SUPER_ADMIN`, `COMPANY_ADMIN`, `ANALYST`, `VIEWER`
- **UserStatus:** `ACTIVE`, `INACTIVE`, `SUSPENDED`
- **InventoryTransactionType:** `RESTOCK`, `SALE`, `ADJUSTMENT`, `RETURN` (legacy, unused)
- **StockStatus:** `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`
- **InventoryMovementType:** `SALE`, `MANUAL_ADJUSTMENT`, `STOCK_ADDITION`, `STOCK_REMOVAL`
- **SaleStatus:** `COMPLETED`, `REFUNDED`, `CANCELLED`
- **AuditAction:** `COMPANY_REGISTERED`, `USER_LOGIN`, `USER_LOGOUT`, `PASSWORD_CHANGED`, `LOGIN_FAILED`, `USER_INVITED`, `USER_UPDATED`, `USER_DEACTIVATED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`, `PRODUCT_ACTIVATED`, `PRODUCT_DEACTIVATED`, `PRODUCT_MARKED_OUT_OF_STOCK`, `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DELETED`, `INVENTORY_ADJUSTED`, `INVENTORY_UPDATED`, `SALE_CREATED`, `SALE_UPDATED`, `SALE_DELETED`, `SALE_REFUNDED`, `COMPANY_UPDATED`, `STOCK_ADDED`, `STOCK_REMOVED`, `STOCK_ADJUSTED`, `REORDER_LEVEL_UPDATED`, `PRODUCT_LOW_STOCK`, `PRODUCT_OUT_OF_STOCK`
- **AuditEntityType:** `COMPANY`, `USER`, `CATEGORY`, `PRODUCT`, `INVENTORY`, `SALE`, `REPORT` — the type of entity an `AuditLog` row refers to (nullable; some actions, e.g. a failed login before the user is known, have no associated entity).

## Notes on Stock Integrity

- `Product.stock_quantity` is the current, authoritative stock level; `Inventory.current_stock` mirrors it.
- Every stock mutation — sale, sale refund/edit reversal, or a manual stock adjustment — goes through a single function (`services/inventory.py::apply_stock_delta`) that atomically updates `Product.stock_quantity`, upserts the matching `Inventory` row (`current_stock`, `available_stock = current_stock - reserved_stock`, recomputed `stock_status`), and inserts an `InventoryMovement` row, so stock history can always be reconstructed and cross-checked against the running total.
- `stock_status` is computed from `available_stock` vs. `Inventory.reorder_level` (which is independent of `Product.reorder_level`): `IN_STOCK` when available > reorder level, `LOW_STOCK` when available ≤ reorder level, `OUT_OF_STOCK` when available = 0. Crossing into `LOW_STOCK`/`OUT_OF_STOCK` writes a `Notification` and a `PRODUCT_LOW_STOCK`/`PRODUCT_OUT_OF_STOCK` audit log.
- `reserved_stock` exists for forward compatibility (e.g. a future order-hold feature) but nothing currently sets it away from `0`.

## Migrations

There's no Alembic (or similar) migration framework. The FastAPI app creates any missing tables automatically at startup via `Base.metadata.create_all()`, then runs a set of idempotent, Postgres-only raw-SQL migration functions in `backend/app/migrations.py` (all wired into `on_startup` in `backend/app/main.py`), each safe to re-run on every restart:

- `ensure_sales_schema` — brings older `sales`/`sale_items` rows up to the current shape (invoice numbers, sales channel/payment method, category snapshot on line items, etc.).
- `ensure_product_schema` — renames `products.price`/`products.cost` to `unit_price`/`cost_price`, backfills any product with a missing category into an auto-created `Uncategorized` category for its company, then enforces `category_id NOT NULL`.
- `ensure_audit_log_schema` — creates the `AuditEntityType` enum type and converts `audit_logs.entity_type` from free text to that enum.
- `ensure_inventory_schema` — adds the new `AuditAction` values used by the Inventory module, then backfills an `Inventory` row (with a computed `stock_status`) for any product that doesn't have one yet.

No separate migration step is required for local development — just start the app against a Postgres database, empty or already populated.
