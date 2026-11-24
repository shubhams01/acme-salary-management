# AI-Assisted Development Approach

## Objective

Use AI tools to accelerate development while maintaining engineering ownership, correctness, security, and maintainability.

## Planned AI Usage

| Area | AI Assistance |
|---|---|
| Requirements | Requirement analysis and scope refinement |
| Architecture | Design alternatives and trade-off analysis |
| Backend | API implementation and code reviews |
| Database | Schema design and query optimization |
| Frontend | Component development and UI refinement |
| Testing | Test case generation and edge-case identification |
| Debugging | Error analysis and troubleshooting |
| Documentation | Architecture and implementation documentation |

## Engineering Validation

AI-generated output will not be accepted without review.

- Review generated code before committing.
- Validate database constraints and business rules.
- Execute automated tests.
- Review security-sensitive functionality.
- Verify performance assumptions.
- Document important architectural decisions.

## Development Principle

AI accelerates implementation, but engineering decisions, validation, and final code quality remain the developer's responsibility.

## Assessment Delivery Plan

The assessment requires a complete backend and React/Next.js UI, deterministic seed data for 10,000 employees, meaningful automated tests, a deployed application, and a demo video. The one-page scope is recorded in `docs/assessment-requirements.md`; `docs/requirements.md` retains the detailed product specification.

| Phase | Deliverable | Acceptance evidence |
|---|---|---|
| 0. Product baseline | One-page requirements, scope, and architecture artifacts | Requirements and exclusions are reviewed before feature work |
| 1. Data foundation | PostgreSQL migration, reference data, and deterministic synthetic seed | A clean database can be migrated and seeded with 10,000 employees and salary snapshots |
| 2. HR workflows | Authentication, employee management, salary revisions, and audit trail | HR user can complete employee and compensation workflows through protected APIs |
| 3. Web application | Responsive Next.js UI for directory, salary history, and compensation dashboard | HR user can complete core workflows in the browser |
| 4. Quality and delivery | Core tests, 10,000-record performance checks, deployment, and demo | Critical workflows pass tests; deployed app and demo are ready to review |

### Delivery Practices

- Build one phase at a time and commit each coherent phase so the Git history records the project's evolution.
- Prefer vertical slices that connect the database, API, and UI over isolated components that cannot yet be used.
- Keep synthetic data deterministic so tests and demonstrations are repeatable.
- Review AI-assisted changes and run the relevant tests and builds before each phase commit.
