# API Reference

Base URL: `http://localhost:4000/api`

All endpoints except `auth/register`, `auth/login`, `auth/refresh`, and `auth/forgot-password` require an `Authorization: Bearer <access_token>` header. Endpoints marked **Admin** additionally require `COMPANY_ADMIN` or `SUPER_ADMIN`; endpoints marked **Manager** also allow `ANALYST`.

## Auth — `/auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | none | Registers a new company + its first `COMPANY_ADMIN` user. |
| POST | `/login` | none | Returns an access/refresh token pair. |
| POST | `/refresh` | none (refresh token in body) | Rotates the refresh token, returns a new pair. |
| POST | `/logout` | required | Revokes the given refresh token. |
| POST | `/forgot-password` | none | Always returns 200; does not reveal whether the email exists. |
| POST | `/change-password` | required | Changes the current user's password and revokes all sessions. |

## Profile — `/profile`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | required | Current user + their company. |
| PATCH | `/` | required | Update own display name. |

## Company — `/company`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | required | Get the current company. |
| PATCH | `/` | Admin | Update company name/industry/address/phone. |

## Users — `/users`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | Admin | List users in the company. |
| POST | `/` | Admin | Invite (create) a user. |
| GET | `/:id` | Admin | Get a user. |
| PATCH | `/:id` | Admin | Update a user's name/role/status. |
| DELETE | `/:id` | Admin | Deactivate a user (soft delete, sets status `INACTIVE`). |

## Categories — `/categories`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | required | List categories. |
| GET | `/:id` | required | Get a category. |
| POST | `/` | Manager | Create a category. |
| PATCH | `/:id` | Manager | Update a category. |
| DELETE | `/:id` | Manager | Delete a category (fails with 409 if it still has products). |

## Products — `/products`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/?search=&categoryId=&isActive=` | required | List/filter products. |
| GET | `/low-stock` | required | Products at or below their reorder level. |
| GET | `/:id` | required | Get a product. |
| POST | `/` | Manager | Create a product (SKU must be unique per company). Body fields include `categoryId` (required), `unitPrice`, `costPrice` (response uses `unit_price`/`cost_price`). |
| PATCH | `/:id` | Manager | Update a product. |
| DELETE | `/:id` | Manager | Delete a product. |

Every product must belong to a category — `categoryId` is required on create and, if supplied, on update; there is no "uncategorized" option in the API.

## Inventory — `/inventory`

Every product has exactly one `inventory` record (created automatically when the product is created). Read endpoints allow `COMPANY_ADMIN`, `SUPER_ADMIN`, and `ANALYST`; mutating endpoints (**Admin**) require `COMPANY_ADMIN`/`SUPER_ADMIN`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/?search=&categoryId=&brand=&stockStatus=&sort=&page=&pageSize=` | required | List inventory records with current/reserved/available stock, reorder level, and computed stock status. `sort` accepts `name`/`-name`, `stock`/`-stock`, `recent`/`-recent`. |
| GET | `/summary` | required | Dashboard cards: total products, total inventory quantity, low-stock count, out-of-stock count. |
| GET | `/charts` | required | `{ byCategory, byStatus }` aggregates for the dashboard charts. |
| GET | `/movements?productId=&page=&pageSize=` | required | Stock movement history (`SALE`, `STOCK_ADDITION`, `STOCK_REMOVAL`, `MANUAL_ADJUSTMENT`), newest first. |
| POST | `/:inventoryId/adjust` | Admin | Add/remove/adjust stock. Body: `adjustmentType` (`STOCK_IN`/`STOCK_OUT`/`MANUAL_ADJUSTMENT`), `direction` (`INCREASE`/`DECREASE`, required only for `MANUAL_ADJUSTMENT`), `quantity` (> 0), `reason` (required), `remarks` (optional). Rejects negative resulting stock and stock-out quantities that exceed available stock. |
| PATCH | `/:inventoryId/reorder-level` | Admin | Update the inventory record's reorder level (independent of the product's own `reorderLevel`); recomputes stock status. |

Stock status is computed automatically from `availableStock` vs `reorderLevel`: `IN_STOCK` when available > reorder level, `LOW_STOCK` when available ≤ reorder level (and > 0), `OUT_OF_STOCK` when available = 0. Crossing into `LOW_STOCK`/`OUT_OF_STOCK`, and any manual adjustment, creates a `Notification` and an audit log entry.

## Notifications — `/notifications`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | Admin | Most recent notifications for the company (low stock, out of stock, manual stock adjustments). |

## Sales — `/sales`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | required | List sales (most recent first). |
| GET | `/:id` | required | Get a sale with its line items. |
| POST | `/` | Manager | Create a sale; decrements stock per line item and logs a `SALE` inventory movement. |
| POST | `/:id/refund` | Manager | Refund a sale; restocks items and logs a `STOCK_ADDITION` inventory movement. |

`customerName` is intentionally optional. RetailPulse models point-of-sale/retail transactions, which routinely include anonymous or walk-in customers who never give a name — requiring one would block a normal checkout flow. Invoice numbers (`INV-{year}-{sequence}`, per company per year) are generated server-side; under concurrent requests, a numbering conflict is detected via a database-level unique constraint on `(company_id, invoice_number)` and resolved by transparently regenerating and retrying, so callers never see duplicate invoice numbers.

## Analytics — `/analytics`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/summary` | required | Total revenue, orders, customers, low-stock count. |
| GET | `/revenue?days=30` | required | Daily revenue series for the last N days. |
| GET | `/top-products?limit=5` | required | Best-selling products by units sold. |
| GET | `/sales-by-category` | required | Revenue grouped by category. |

## Reports — `/reports`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/sales?from=&to=` | required | Sales report for an optional date range. |
| GET | `/inventory` | required | Current inventory valuation and low-stock report. |

## Error Format

```json
{ "detail": "Human-readable message" }
```

Validation errors (422) return `detail` as the underlying zod issue array instead of a string.
