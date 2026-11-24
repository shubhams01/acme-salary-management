# ADR-003: Multi-Currency Salary Management

**Status:** Accepted

## Context
Employees work across countries with different currencies.

## Decision
Store salary amounts in their original currency using decimal precision. Group analytics by currency.

## Consequences
- Accurate local compensation records.
- No misleading cross-currency totals.
- Exchange-rate conversion can be added later.