# Session 27 duplicate ticket DUPE-03: one procedure engine for moving bills

**State:** open on current main `5e3238b`.

The reusable member-facing clock is in `src/simulation/governing/legislative-clock.ts` (`:757`, `:1239`, `:1449`), but bill progress also has separate consequence routes in `src/simulation/governing/state-governing.ts:365`, `src/simulation/governing/congress-lawmaking.ts:180`, and `src/simulation/living-world/local-council-meetings.ts:117,587`. Effective-date handling is split between typed dates in `legislative-clock.ts:1191-1205` and office enactment records in `state-governing.ts:2485,2511`.

**Work:** identify the five clock-driven bill-moving paths and four effective-date rules in those procedures, then route them through one procedure engine parameterized by body rules. Preserve body-specific signatures, veto/reconsideration, and enacted-law dates as rule data; add parity tests for the body types already supported before removing old paths.
