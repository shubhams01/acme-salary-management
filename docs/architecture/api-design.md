# API Design

## Authentication

POST /auth/login  
POST /auth/refresh  
POST /auth/logout

## Employees

GET /employees  
GET /employees/:id  
POST /employees  
PATCH /employees/:id  
PATCH /employees/:id/status

## Organization

GET /countries  
GET /departments  
GET /designations  
GET /currencies

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