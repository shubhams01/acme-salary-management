# Security Design

## Authentication
- Hash passwords with Argon2id.
- Use short-lived JWT access tokens.
- Use secure, HTTP-only refresh-token cookies.
- Implement logout and token revocation.

## Authorization
- Implement role-based access control.
- Enforce permissions in backend middleware.
- Never rely on frontend visibility for security.

## Data Protection
- Validate all API inputs.
- Use HTTPS in production.
- Protect sensitive employee salary information.
- Avoid logging passwords, tokens, or salary details.
- Apply restrictive CORS configuration.
- Use rate limiting for authentication endpoints.

## Database
- Use parameterized queries through Prisma.
- Enforce relational constraints.
- Use transactions for salary changes.
- Use least-privilege database credentials.

## Auditability
- Record salary creation and revision events.
- Capture the acting user, action, timestamp, and affected employee.
- Prevent ordinary users from modifying audit history.