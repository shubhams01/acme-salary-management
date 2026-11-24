# System Architecture

## 1. Overview

ACME Salary Management System follows a modular monolithic architecture with a separately deployed frontend and backend.

The architecture separates presentation, business logic, data access, and persistence.

## 2. Components

### Frontend
- React with Next.js and TypeScript.
- Tailwind CSS and shadcn/ui.
- Feature-based component organization.
- REST API integration.
- Server-side pagination and filtering.

### Backend
- Node.js with Express and TypeScript.
- Modular business domains.
- Zod request validation.
- Prisma database access.
- Centralized error handling.
- Authentication and authorization middleware.

### Database
- PostgreSQL.
- Relational data model.
- Foreign key constraints.
- Decimal monetary fields.
- Transactional salary revisions.

## 3. Backend Modules

| Module | Responsibility |
|---|---|
| Auth | Authentication and authorization |
| Employees | Employee lifecycle and directory |
| Organization | Countries, departments and designations |
| Salary | Compensation and revisions |
| Analytics | Organizational salary insights |
| Audit | Sensitive operation history |

## 4. Architectural Principles

- Separation of concerns.
- Single responsibility.
- Explicit business rules.
- Database transactions for salary changes.
- Backend-enforced security.
- Testable services and repositories.
- Avoid premature microservices.

## 5. Request Lifecycle

1. Frontend sends an authenticated HTTP request.
2. Express receives the request.
3. Authentication middleware validates identity.
4. Authorization middleware checks permissions.
5. Zod validates the request.
6. Controller delegates to the service layer.
7. Service executes business logic.
8. Prisma accesses PostgreSQL.
9. Standardized response is returned.

## 6. Scalability

The application will use stateless API instances, database connection pooling, indexed queries, server-side pagination, and database aggregations.