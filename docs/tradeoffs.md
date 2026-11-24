# Engineering Trade-offs

| Decision | Reason |
|---|---|
| React with Next.js | Structured React application with routing and rendering flexibility. |
| Node.js with Express | Lightweight and modular backend. |
| TypeScript | Type safety across frontend and backend. |
| PostgreSQL | Relational integrity and transactional consistency. |
| Prisma | Type-safe database access and migrations. |
| Modular monolith | Avoid unnecessary distributed-system complexity. |
| REST API | Straightforward integration and testing. |
| Decimal monetary types | Prevent floating-point precision issues. |
| Salary revision history | Preserve historical compensation records. |
| Server-side pagination | Avoid transferring all 10,000 employees to the browser. |

## Deliberate Simplifications

### Multi-Currency
Store local salary amounts and currency codes. Initially show analytics grouped by currency instead of presenting misleading consolidated totals.

### Authentication
Start with HR Manager authentication and a role-based authorization foundation rather than implementing a complete enterprise identity platform.

### Analytics
Use PostgreSQL aggregation queries rather than introducing a separate analytics infrastructure.

### Architecture
Use a modular monolith. Microservices are unnecessary for the initial scale and feature set.