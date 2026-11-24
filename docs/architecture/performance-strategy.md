# Performance Strategy

## Initial Scale
10,000 employees.

## Database
- Index frequently filtered columns.
- Use efficient joins and selective projections.
- Use connection pooling.
- Perform aggregation in PostgreSQL.
- Avoid N+1 queries.

## API
- Server-side pagination.
- Validate pagination limits.
- Restrict sorting to supported columns.
- Return only necessary fields.

## Frontend
- Lazy-load noncritical pages and charts.
- Avoid unnecessary rendering.
- Use loading and empty states.
- Cache suitable reference data.

## Performance Validation
- Test employee listing with 10,000 records.
- Measure search and filtering response times.
- Verify dashboard aggregation queries.
- Monitor slow queries.
- Establish performance baselines before optimization.