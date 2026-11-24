# ADR-002: Effective-Dated Salary History

**Status:** Accepted

## Context
Salary information changes over time and historical compensation must remain available.

## Decision
Store salary revisions as effective-dated snapshots. Each revision contains its own compensation components.

## Consequences
- Historical salary reconstruction.
- Traceable salary changes.
- Transactional revision creation.
- No independent mutable salary snapshot.