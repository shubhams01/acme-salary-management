# API Design

## Authentication

POST /api/v1/auth/login  
POST /api/v1/auth/refresh  
POST /api/v1/auth/logout

## Employees

GET /api/v1/employees?page=1&pageSize=25&search=alex&status=ACTIVE  
GET /api/v1/employees/:id  
POST /api/v1/employees  
PATCH /api/v1/employees/:id  
PATCH /api/v1/employees/:id/status

## Organization

GET /api/v1/countries  
GET /api/v1/departments  
GET /api/v1/designations  
GET /api/v1/currencies

## Salary

GET /employees/:id/salary  
POST /employees/:id/salary  
POST /employees/:id/salary/revisions  
GET /employees/:id/salary/history  
GET /employees/:id/salary/history/:revisionId

## Analytics

GET /analytics/overview  
GET /analytics/by-country  
GET /analytics/by-department  
GET /analytics/distribution  
GET /analytics/trends

## Audit

GET /audit-logs  
GET /audit-logs/:id

## API Conventions

- JSON request and response bodies.
- Consistent HTTP status codes.
- Zod request validation.
- Standardized error responses.
- Pagination metadata.
- Backend authorization.
- Filtering and sorting through query parameters.
