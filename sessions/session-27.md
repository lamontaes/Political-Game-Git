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

## CTO instructions and findings (do these)
- CTO DUPLICATES LIST (cto-notes/dupes-audit-2026-10-07.md, top items): (1) seven member-vote rules → one; (2) three amendment pipelines with two yearly schedulers both firing (time-work.ts ~2084/~2086) → one; (3) five bill-moving loops and four effective-date rules → one procedure engine parameterized by body rules; (4) four law→outcome tables: keep the outcome web, delete law-effect-paths.ts and causal-effects.ts; (5) clock handlers looked up twice (main list + hidden backup future-transitions.ts ~353, duplicates all 21 crisis handlers; first match wins silently) → one list, duplicate keys throw; (6) ~14 body-rules lookups and a hard-coded "us-congress-v1" at enacted-law-effects.ts ~785; (7) two campaign contribution rule sets (Kentucky-only check campaigns.ts ~875) and two winner-seating writers; (8) three trait-effect loaders (thrill-seeking never loads though personality-trait-registry.ts ~118 lists it as wired).
- Also remove hard-coded places/fixtures from live code: Lexington default (demo.ts ~109), fixture-built policy changes with fixed July 1 2026 dates (run-c-working-document.ts ~577), every state repeating its 2024 presidential vote.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
