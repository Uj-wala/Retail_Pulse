# RetailPulse Analytics

A retail analytics platform for tracking products, categories, inventory, sales, and performance across a company — a mini ERP with analytics built in.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access + refresh tokens) with role-based access control

## Project Structure

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for the full folder layout.

- `frontend/` — React app (pages, components, API clients, routing)
- `backend/` — Express API (controllers, services, repositories, Prisma schema)
- `docs/` — API reference, database schema, and requirements

## Getting Started

### 1. Start PostgreSQL

```bash
docker compose up postgres -d
```

Or point `DATABASE_URL` in `backend/.env` at your own PostgreSQL instance.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # adjust values as needed
npx prisma migrate dev
npm run dev
```

The API runs on `http://localhost:4000`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app runs on `http://localhost:5173`.

### 4. Everything via Docker Compose

```bash
docker compose up
```

## Roles

| Role | Permissions |
| --- | --- |
| `SUPER_ADMIN` | Platform-level access across companies (reserved for future multi-tenant admin tooling) |
| `COMPANY_ADMIN` | Full access to their company: users, settings, products, sales, reports |
| `ANALYST` | Manage products, categories, inventory, and sales; view reports |
| `VIEWER` | Read-only access to dashboards, analytics, and reports |

## Documentation

- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Software Requirements](docs/SRS.md)

## License

See [LICENSE](LICENSE).
