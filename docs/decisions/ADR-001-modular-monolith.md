# ADR-001: Modular Monolith

**Status:** Accepted

## Context
The application initially supports 10,000 employees and a limited number of HR workflows.

## Decision
Use a modular monolith with independent business modules.

## Consequences
- Easier deployment.
- Simpler debugging.
- Lower infrastructure overhead.
- Clear module boundaries.
- Future extraction into services remains possible.