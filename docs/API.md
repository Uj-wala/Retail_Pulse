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
| POST | `/` | Manager | Create a product (SKU must be unique per company). |
| PATCH | `/:id` | Manager | Update a product. |
| DELETE | `/:id` | Manager | Delete a product. |

## Inventory — `/inventory`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/?productId=` | required | List inventory transactions. |
| POST | `/` | Manager | Record a manual stock movement (restock/adjustment); updates the product's stock atomically. |

## Sales — `/sales`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | required | List sales (most recent first). |
| GET | `/:id` | required | Get a sale with its line items. |
| POST | `/` | Manager | Create a sale; decrements stock per line item and logs `SALE` inventory transactions. |
| POST | `/:id/refund` | Manager | Refund a sale; restocks items and logs `RETURN` inventory transactions. |

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
