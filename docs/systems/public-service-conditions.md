# Public-service conditions (CRUNCH46 08 CHANGE)

`projectPublicServiceConditions(world, jurisdictionId)` in
`src/presentation/public-service-conditions.ts` is CHANGE's public-service
projection. It reads GOVERNING's typed program records
(`history.publicProgramRecords`, `public-program/v1`) and writes nothing.

For each program in the place:

- **Capacity timeline:** the declared capacity record, followed by each
  capacity outturn written after delivered work. The out-of-service count is
  the service's backlog, in its own units. A point exists only where a record
  put it; there is no interpolation.
- **Backlog change:** the backlog at declaration compared with the latest
  record: reduced, unchanged or grew.
- **Completed share:** the declared or observed `completedPermille`. Repaired
  units never raise it.
- **Funding:** GOVERNING's `programPosition` (appropriated, committed,
  uncommitted, posted, pending, operating months posted).
- **Failures:** failed installments, with the reason GOVERNING recorded.
- **Basis:** the figures' basis label ("Illustrative figures" for authored
  fixtures).

Money moves only through GOVERNING's public-account writer. CHANGE adds no
ledger, forecast or service-quality curve. UI owns any mount.
