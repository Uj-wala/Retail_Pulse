# Project Structure

```
RetailPulse/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                  # axios client + one file per backend domain
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/            # Button, Card, Badge, Modal, ConfirmDialog, Spinner, EmptyState
│   │   │   ├── layout/            # Sidebar, SidebarNavItem
│   │   │   ├── dashboard/         # StatCard, RevenueChart, TopProductsCard, CategoryBreakdownChart
│   │   │   ├── forms/             # FormTextField, PasswordField, FormSelect, FormTextArea
│   │   │   └── tables/            # Table primitives
│   │   ├── context/               # AuthContext, ThemeContext, NotificationContext
│   │   ├── hooks/                 # useAuth, useTheme, useNotification
│   │   ├── layouts/               # AuthLayout, DashboardLayout
│   │   ├── pages/
│   │   │   ├── auth/               # Login, Register, ForgotPassword
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── inventory/
│   │   │   ├── sales/
│   │   │   ├── analytics/
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   ├── settings/
│   │   │   ├── profile/
│   │   │   └── notfound/
│   │   ├── routes/                # AppRoutes, ProtectedRoute, RoleRoute
│   │   ├── services/               # formatters, csvExport
│   │   ├── store/                  # queryClient
│   │   ├── types/                  # shared domain types
│   │   ├── utils/                  # cn, tokenStore
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── config.py                # pydantic-settings environment config
│   │   ├── database.py              # SQLAlchemy engine/session
│   │   ├── models.py                # SQLAlchemy ORM models + enums
│   │   ├── schemas.py               # Pydantic request schemas per domain
│   │   ├── security.py              # JWT, password hashing, auth dependencies
│   │   ├── serializers.py           # ORM model -> API response dicts
│   │   ├── main.py                  # FastAPI app, CORS, router registration
│   │   ├── routers/                 # FastAPI routers (HTTP in/out), one per domain
│   │   └── services/                # business logic + queries, one per domain + audit
│   └── requirements.txt
│
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   ├── PROJECT_STRUCTURE.md
│   └── SRS.md
│
├── docker-compose.yml
├── README.md
└── LICENSE
```

## Conventions

- **Layering (backend):** `routers` (HTTP in/out, auth/role dependencies) → `services` (business logic, audit logging, SQLAlchemy queries). Request validation happens via Pydantic models in `schemas.py`.
- **Multi-tenancy:** every domain table (`categories`, `products`, `sales`, ...) carries a `company_id` foreign key. Services always scope queries to `current_user.company_id` — there is no cross-company access.
- **Auth:** JWT access tokens (short-lived) + opaque refresh tokens (hashed at rest, rotated on use, revoked on reuse-detection).
- **Frontend data fetching:** TanStack Query for all server state; forms use `react-hook-form` + `zod` via `@hookform/resolvers`.
