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
- FR-10: Managers can create, update, and delete products, each with a SKU (unique per company), unit price, cost price, stock quantity, and reorder level. Every product must belong to a category; category assignment is mandatory at creation and cannot be cleared on update.
- FR-11: Any authenticated user can list and search products/categories.

### 4.4 Inventory
- FR-12: Managers can record manual stock movements (restock, adjustment). Every movement is logged as an immutable `InventoryTransaction` and atomically updates the product's stock quantity.
- FR-13: The system prevents adjustments that would drive stock negative.
- FR-14: Any authenticated user can view the inventory movement history and the current low-stock list.

### 4.5 Sales
- FR-15: Managers can record a sale with one or more line items. Stock is decremented and a `SALE` inventory transaction is recorded per line item, atomically with the sale.
- FR-16: A sale cannot be created if any line item exceeds available stock.
- FR-17: Managers can refund a completed sale, which restocks all items and records `RETURN` inventory transactions.

### 4.6 Analytics & Reporting
- FR-18: Any authenticated user can view a dashboard summary (total revenue, orders, customers, low-stock count).
- FR-19: Any authenticated user can view revenue over time, top-selling products, and revenue by category.
- FR-20: Any authenticated user can generate and export (CSV) a sales report and an inventory report, optionally scoped to a date range.

### 4.7 Auditing
- FR-21: Security-relevant and business events (logins, failed logins, password changes, company/user/product/category/inventory/sale mutations) are written to an append-only audit log scoped to the company.

## 5. Non-Functional Requirements

- NFR-1 (Tenant isolation): every query for company-owned data is scoped by `company_id`; no endpoint allows cross-company reads or writes.
- NFR-2 (Auth security): passwords are hashed with bcrypt; refresh tokens are stored hashed, never in plaintext.
- NFR-3 (Consistency): any operation that touches stock (sales, refunds, manual adjustments) is wrapped in a single database transaction.
- NFR-4 (Usability): the UI supports light and dark themes and is responsive down to mobile widths for authentication screens.
- NFR-5 (Observability): audit logs provide a reconstructable history of who changed what and when, per company.

## 6. Out of Scope (current version)

- Real outbound email delivery for password resets (the endpoint exists but does not send email yet).
- Payment processing / external POS hardware integration.
- Fine-grained per-permission access control beyond the four roles above.
