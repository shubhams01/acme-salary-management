# Database Design

## 1. Database

PostgreSQL with Prisma ORM.

## 2. Tables

### users
Authentication accounts for authorized HR users.

### roles
Application roles and access levels.

### employees
Employee master data, including employee code, name, email, country, department, designation, and status.

### countries
Country master data and country codes.

### departments
Organizational departments.

### designations
Employee job titles.

### currencies
Supported ISO 4217 currency codes.

### salaries
One compensation account per employee.

### salary_revisions
Effective-dated salary snapshots with base salary, gross salary, currency, and revision dates.

### salary_components
Individual compensation components associated with a salary revision.

### audit_logs
Records of sensitive operations, including salary modifications.

## 3. Relationships

- One role can belong to multiple users.
- One country can contain multiple employees.
- One department can contain multiple employees.
- One designation can contain multiple employees.
- One employee can have one salary account.
- One salary account can have multiple revisions.
- One revision can have multiple components.
- One user can create multiple audit events.

## 4. Data Integrity

- Employee codes must be unique.
- Employee email addresses must be unique.
- Monetary fields use DECIMAL(19,4).
- Salary revision periods must not overlap.
- Salary components belong to a specific revision.
- Salary revisions cannot be modified through normal application operations after creation.
- Salary modifications must be transactional.

## 5. Indexing

Indexes will cover employee code, email, country, department, designation, status, salary account, and salary revision effective dates.

## 6. Currency

All salary records use a valid ISO 4217 currency code. Cross-currency aggregation is prohibited unless an explicit exchange-rate conversion is available.