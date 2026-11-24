# ACME Salary Management System

A web-based employee compensation management platform designed for organizations managing salary information across multiple countries.

## Technology Stack

- React / Next.js
- Node.js / Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- shadcn/ui

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
    tests/
  web/ (planned)

docs/
  requirements.md
  product-scope.md
  assumptions.md
  tradeoffs.md
  ai/
```

## Development Status

The repository contains the MVP requirements and architecture docs plus an in-progress API foundation (health checks, HR authentication scaffolding, Prisma schema, and administrator seed). Employee CRUD, salary workflows, analytics, audit endpoints, and the web application remain to be implemented; they are defined in the product documentation but are not yet available.

## Local API Setup

1. Install dependencies from the repository root with `npm install`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and set the local values.
3. Start PostgreSQL with `npm run db:up`.
4. Generate the Prisma client with `npm run prisma:generate --workspace=@acme/api`.
5. Apply the development migration with `npm run db:migrate`.
6. Start the API with `npm run dev:api`.

The API listens on port 4000 by default. Liveness and readiness endpoints are available at `/api/v1/health/live` and `/api/v1/health/ready`.

Root scripts `npm run build:api`, `npm run typecheck:api`, and `npm run test:api` target the API workspace.

## Documentation

- Product requirements
- Product scope
- Assumptions
- Engineering trade-offs
- AI-assisted development approach
