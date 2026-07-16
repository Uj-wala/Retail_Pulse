# Database Schema

PostgreSQL via SQLAlchemy. Full schema source: [`backend/app/models.py`](../backend/app/models.py).

## Entity Overview

| Model | Purpose |
| --- | --- |
| `Company` | A tenant. Every other business entity belongs to exactly one company. |
| `User` | A person who can log in. Belongs to a company, has a `role` and `status`. |
| `RefreshToken` | Hashed, rotating refresh tokens for a user's session. |
| `Category` | Groups products within a company. Unique `(company_id, name)`. |
| `Product` | Catalog item: SKU, price, cost, stock quantity, reorder level. Unique `(company_id, sku)`. |
| `InventoryTransaction` | An immutable log of stock movement (restock, sale, adjustment, return). |
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

Category 1---* Product   (optional: a Product may have no category)

Product 1---* SaleItem
Product 1---* InventoryTransaction

Sale 1---* SaleItem
Sale *---1 User            (the cashier who recorded it)

User 1---* RefreshToken
User 1---* AuditLog
User 1---* InventoryTransaction
```

## Enums

- **UserRole:** `SUPER_ADMIN`, `COMPANY_ADMIN`, `ANALYST`, `VIEWER`
- **UserStatus:** `ACTIVE`, `INACTIVE`, `SUSPENDED`
- **InventoryTransactionType:** `RESTOCK`, `SALE`, `ADJUSTMENT`, `RETURN`
- **SaleStatus:** `COMPLETED`, `REFUNDED`, `CANCELLED`
- **AuditAction:** `COMPANY_REGISTERED`, `USER_LOGIN`, `USER_LOGOUT`, `PASSWORD_CHANGED`, `LOGIN_FAILED`, `USER_INVITED`, `USER_UPDATED`, `USER_DEACTIVATED`, `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`, `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DELETED`, `INVENTORY_ADJUSTED`, `SALE_CREATED`, `SALE_REFUNDED`, `COMPANY_UPDATED`

## Notes on Stock Integrity

- `Product.stock_quantity` is the current, authoritative stock level.
- Every change to `stock_quantity` (via a sale, refund, restock, or manual adjustment) is paired with an `InventoryTransaction` row inside the same database transaction, so stock history can always be reconstructed and cross-checked against the running total.
- Selling a product decrements stock and inserts a `SALE`-type transaction; refunding a sale re-increments stock and inserts a `RETURN`-type transaction — both happen within the same request/DB session.

## Migrations

The FastAPI app creates any missing tables automatically at startup via `Base.metadata.create_all()` (see `backend/app/main.py`), so no separate migration step is required for local development. It never alters existing tables, so it's safe to run against a database that already has this schema.
