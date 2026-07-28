# Software Requirements Specification — RetailPulse Analytics

## 1. Purpose

RetailPulse is a business dashboard platform that helps retail companies track products, sales, inventory, and performance from one place — a mini ERP with analytics built in.

## 2. Scope

A multi-tenant web application. Each **company** is a tenant; its data (products, categories, sales, inventory, users) is fully isolated from every other company. Users authenticate with email/password and are assigned a role that determines what they can do within their company.

## 3. Actors / Roles

| Role | Description |
| --- | --- |
| `SUPER_ADMIN` | Reserved for future platform-level administration across companies. |
| `COMPANY_ADMIN` | Owns a company's account. Full access: users, settings, catalog, sales, reports. Created automatically when a company registers. |
| `ANALYST` | Day-to-day operator: manages products, categories, inventory, and sales; views analytics/reports. Cannot manage users or company settings. |
| `VIEWER` | Read-only: dashboards, analytics, and reports only. |

## 4. Functional Requirements

### 4.1 Authentication
- FR-1: A visitor can register a new company, which creates the company and its first `COMPANY_ADMIN` user in one transaction.
- FR-2: A user can log in with email + password and receive a short-lived access token and a rotating refresh token.
- FR-3: A user can request a password reset without the system revealing whether the email is registered.
- FR-4: A logged-in user can change their password, which revokes all of their active sessions.
- FR-5: Refresh tokens are single-use; reusing an already-rotated token revokes all sessions for that user (reuse-detection).

### 4.2 Company & Users
- FR-6: A `COMPANY_ADMIN` can view and update their company's profile (name, industry, address, phone).
- FR-7: A `COMPANY_ADMIN` can invite new users with a role, and update or deactivate existing users.
- FR-8: A user can view and update their own profile (name).

### 4.3 Catalog
- FR-9: Managers (`ANALYST`+) can create, update, and delete categories. A category cannot be deleted while products still reference it.
- FR-10: Managers can create, update, and delete products, each with a SKU (unique per company), unit price, cost price, stock quantity, reorder level, and an optional brand. Every product must belong to a category; category assignment is mandatory at creation and cannot be cleared on update.
- FR-11: Any authenticated user can list and search products/categories, including filtering by category, status, and brand.
- FR-12: The system exposes the distinct set of brand values currently in use for the company, so that brand filters in the UI are presented as a selectable dropdown populated with real values rather than a free-text box.

### 4.4 Inventory
- FR-13: Managers can record manual stock movements (restock, adjustment). Every movement is logged as an immutable `InventoryTransaction` and atomically updates the product's stock quantity.
- FR-14: The system prevents adjustments that would drive stock negative.
- FR-15: Any authenticated user can view the current low-stock list.
- FR-16: Any authenticated user can view the inventory movement history for a product as a paginated list; the UI must let the user page through (or load more of) the full history rather than being capped at a fixed number of records.
- FR-17: A manager/admin can update a product's reorder level directly from the inventory view. This must be a reachable UI action, not only an API capability.
- FR-18: Any "last updated" timestamp shown for an inventory record must reflect that record's actual last-modified time, not the time the page happened to render.

### 4.5 Sales
- FR-19: Managers can record a sale with one or more line items. Stock is decremented and a `SALE` inventory transaction is recorded per line item, atomically with the sale.
- FR-20: A sale cannot be created if any line item exceeds available stock.
- FR-21: Managers can refund a completed sale, which restocks all items and records `RETURN` inventory transactions.

### 4.6 Analytics & Reporting
- FR-22: Any authenticated user can view a dashboard summary (total revenue, orders, customers, low-stock count). If the summary data fails to load, the UI must show an explicit error state with a retry action instead of silently rendering placeholder values.
- FR-23: Any authenticated user can view revenue over time, top-selling products, and revenue by category. These charts are subject to the same error/retry requirement as FR-22.
- FR-24: Any authenticated user can generate and export (CSV) a sales report and an inventory report, optionally scoped to a date range.

### 4.7 Auditing
- FR-25: Security-relevant and business events (logins, failed logins, password changes, company/user/product/category/inventory/sale mutations) are written to an append-only audit log scoped to the company.

## 5. Non-Functional Requirements

- NFR-1 (Tenant isolation): every query for company-owned data is scoped by `company_id`; no endpoint allows cross-company reads or writes. This applies equally to internal lookup/get-or-create helpers keyed by a foreign id (e.g. looking up an inventory row by `product_id`) — such lookups must still filter by `company_id` and must never assume the foreign id alone is enough to guarantee tenant scoping.
- NFR-2 (Auth security): passwords are hashed with bcrypt; refresh tokens are stored hashed, never in plaintext.
- NFR-3 (Consistency): any operation that touches stock (sales, refunds, manual adjustments) is wrapped in a single database transaction.
- NFR-4 (Usability): the UI supports light and dark themes and is responsive down to mobile widths for authentication screens. Sortable tables must visually indicate which column and direction is currently active (e.g. a header highlight or arrow), not rely solely on a separate sort control.
- NFR-5 (Observability): audit logs provide a reconstructable history of who changed what and when, per company.
- NFR-6 (Reliability / error handling): any view that aggregates or summarizes data (dashboard summary cards, charts, reports) must distinguish a failed fetch from a genuinely empty or zero result. On failure it must show an explicit error state with a retry action, never a silent placeholder (e.g. "—") that looks like real data.

## 6. Known Implementation Gaps

Tracked defects in the current build, against the requirements above. Remove each row once fixed and verified.

| # | Gap | Violates | Severity | Status |
| --- | --- | --- | --- | --- |
| KG-1 | Brand filter (Inventory & Products pages) is a free-text input; no endpoint yet lists distinct brands for the company. | FR-12 | Medium | Fixed — added `GET /products/brands`; both pages now render a brand `<select>` populated from it. |
| KG-2 | Movement history drawer hardcodes `pageSize: 50` with no pagination UI, even though the backend already supports `page`/`pageSize`/`total`. | FR-16 | Medium | Fixed — drawer now pages through movements (20/page) using the shared `Pagination` component. |
| KG-3 | `updateReorderLevel` exists in `inventoryApi.ts` and the backend, but no UI component calls it — admins cannot actually update reorder levels. | FR-17 | Medium | Fixed — added a "Update reorder level" row action (manager roles only) opening `ReorderLevelModal`, wired to the existing API call. |
| KG-4 | The "Last updated" label on the Inventory page renders `new Date()` (page render time) instead of a real record timestamp, even though `Inventory.updated_at` is already serialized by the API. | FR-18 | Low | Fixed — now derived from the max `updated_at` across the loaded inventory rows (`InventoryPage.tsx`). |
| KG-5 | `get_or_create_inventory` (`backend/app/services/inventory.py`) looks up the existing `Inventory` row by `product_id` only, without also filtering by `company_id`. Inconsistent with every other query in the same module and a tenant-isolation risk. | NFR-1 | High | Fixed — lookup now filters on `product_id` and `company_id`. |
| KG-6 | Table headers (`TableHeaderCell`) have no active-sort indicator; sorting is only reflected in a separate dropdown. | NFR-4 | Low | Fixed — `TableHeaderCell` accepts `sortDirection` and renders an arrow/highlight; wired in Inventory, Products, and Sales pages. |
| KG-7 | Dashboard and Inventory summary cards/charts have no `isError` handling: a failed query silently renders "—" or empty charts with no error message or retry. | NFR-6 | Medium | Fixed — summary cards and charts on both pages now show a loading spinner or an `ErrorState` with retry on failure. |

## 7. Out of Scope (current version)

- Real outbound email delivery for password resets (the endpoint exists but does not send email yet).
- Payment processing / external POS hardware integration.
- Fine-grained per-permission access control beyond the four roles above.
