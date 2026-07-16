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
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/                 # env, database (Prisma client), jwt
│   │   ├── controllers/            # auth, company, user, profile, category, product, inventory, sale, analytics, report
│   │   ├── middleware/             # auth, role, company, validation, error
│   │   ├── models/                 # re-exported Prisma types/enums
│   │   ├── repositories/           # Prisma data-access layer, one per entity
│   │   ├── routes/                 # Express routers, one per domain
│   │   ├── services/               # business logic, one per domain + audit
│   │   ├── utils/                  # httpError, security, serializers, request helpers
│   │   ├── validators/             # zod schemas per domain
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
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

- **Layering (backend):** `routes` → `controllers` (HTTP in/out) → `services` (business logic, audit logging) → `repositories` (Prisma queries). Validation happens via `middleware/validation.middleware.ts` using zod schemas from `validators/`.
- **Multi-tenancy:** every domain table (`categories`, `products`, `sales`, ...) carries a `company_id` foreign key. Services always scope queries to `req.user.companyId` — there is no cross-company access.
- **Auth:** JWT access tokens (short-lived) + opaque refresh tokens (hashed at rest, rotated on use, revoked on reuse-detection).
- **Frontend data fetching:** TanStack Query for all server state; forms use `react-hook-form` + `zod` via `@hookform/resolvers`.
