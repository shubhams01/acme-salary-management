# ACME Salary Management — One-Page Requirements

## Goal and user

Give ACME's HR Manager a secure web application to replace spreadsheet-based compensation management for 10,000 employees across multiple countries. The manager must be able to maintain employee and salary records and answer practical questions about how the organization pays people.

## MVP scope

- Authenticate HR users and enforce backend role-based access.
- Maintain employee profiles, including employee code, contact details, country, department, designation, and status.
- Search and filter employees by code, name, email, country, department, designation, and status; paginate and sort results on the server.
- Create salary packages with base pay, allowances, bonuses, and deductions. Calculate gross and net pay on the backend using decimal-safe amounts.
- Record effective-dated salary revisions and retain readable salary history.
- Show a dashboard with employee counts and salary summaries by currency, country, and department. Do not combine currencies without an explicit conversion source.
- Keep an audit trail for sensitive salary changes.
- Provide a responsive React/Next.js UI backed by a TypeScript REST API and relational database.
- Include deterministic synthetic seed data for 10,000 employees, automated tests for core workflows, and a deployed demo application.

## Quality requirements

Protect salary information with authentication, authorization, input validation, secure password hashing, and HTTP-only refresh-token cookies. Keep salary changes transactional and preserve monetary precision and historical records. The directory must remain usable at the target scale through server-side pagination, filtering, and indexed queries. Tests must be deterministic and cover critical business rules and API workflows.

## Deliberately out of scope

Payroll execution, bank transfers, country-specific tax calculations, employee self-service, external HRMS integrations, exchange-rate conversion, and an AI chatbot. The MVP reports amounts grouped by currency and prioritizes reliable HR workflows over complex integrations.

## Acceptance

An HR Manager can log in, find and maintain employees, create and revise salaries, inspect history, and review currency-aware compensation summaries. A clean environment can be migrated and seeded with 10,000 employees; the core workflows pass automated tests; the application is deployed and demonstrated in a short video.

See [the detailed product requirements](requirements.md), [product scope](product-scope.md), and [architecture decisions](architecture/system-architecture.md) for implementation detail.
