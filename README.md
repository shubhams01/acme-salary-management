# ACME Salary Management System

A web-based employee compensation management platform designed for organizations managing salary information across multiple countries.

## Technology Stack

- React / Next.js
- Node.js / Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Mantine

## Planned MVP Features

- Employee management
- Salary management
- Salary revision history
- Multi-currency support
- Compensation analytics
- HR authentication
- Audit logging

## Project Structure

```text
apps/
  api/
    prisma/
    src/
      config/
      middlewares/
      modules/
        auth/
        health/
        employees/
        salary/
        analytics/
        audit/
    tests/
  web/
    app/
    components/

docs/
  requirements.md
  product-scope.md
  assumptions.md
  tradeoffs.md
  ai/
```

## Development Status

The app has an HR sign-in, employee directory, employee create/edit/status actions, salary creation and revision history, and a currency-aware compensation dashboard. The API includes audit events, employee and salary endpoints, grouped analytics, a PostgreSQL migration, and a deterministic 10,000-employee seed. Deployment and the demo video remain delivery work.

## Local Setup

1. Install dependencies from the repository root with `npm install`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and set secure local values. Copy `apps/web/.env.example` to `apps/web/.env.local` if the API URL differs from its default.
3. Start PostgreSQL with `npm run db:up`.
4. Generate the Prisma client with `npm run prisma:generate --workspace=@acme/api`.
5. Apply the checked-in migration with `npm run db:migrate`.
6. Load the 10,000 synthetic employees and salary snapshots with `npm run db:seed`.
7. Create the initial HR administrator with `npm run db:seed:admin`.
8. Start the API and web app in separate terminals with `npm run dev:api` and `npm run dev:web`.

The API listens on port 4000 and the web app on port 3000 by default. Liveness and readiness endpoints are available at `/api/v1/health/live` and `/api/v1/health/ready`.

Root scripts `npm run build:api`, `npm run build:web`, `npm run typecheck:api`, `npm run typecheck:web`, and `npm run test:api` target the respective workspaces.

## Documentation

- Product requirements
- Product scope
- Assumptions
- Engineering trade-offs
- AI-assisted development approach
