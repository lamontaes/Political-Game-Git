# Session 27 — Duplicates in the code

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
One implementation per concept: no parallel pipelines where the live clock calls one copy and the rest of the game reads another.

## Milestones
1. Rebuild #2679 AU-01 on main: one amendment pipeline (living-world/federal-reform.ts, living-world/constitutional-reform.ts, governing/article-v.ts) and Congress as a rule pack instead of 42 US_CONGRESS_PACK_ID special cases.
2. Rebuild #2631 AU-02 on main: one effects map; delete src/simulation/causal-effects.ts after feeding its importers; effect stamp kinds as a union.
3. AU-04 again: enacted-duties.ts reads a filing/report/service record for compliance, not 'any worker on record'.
4. Then the CTO's duplicates list (added here).

## Endpoint
AU-01, AU-02, AU-04 merged-ready, and every item on the CTO's duplicates list consolidated or ticketed with file:line.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
