---
id: people-stopgap-residents-skipped-mechanic
title: "Stopgaps in residents (skipped-mechanic): 1 open"
area: people
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/wages-draw-credit
pr:
blocked-on: engine or design: The credit engine draws only against a standing finance contract; counted wages are residents flows paid by transfer, so a correct draw needs a finance-engine entry for flows (OPUS-CORE).
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/residents.ts, kind skipped-mechanic"
claimed-at: 2026-10-20T03:26:29.054Z
---

**What.** Replace or clear the 1 open skipped-mechanic stopgap row(s) in src/core2/modules/residents.ts: SG-WORLD-wages-skip-credit-line. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/residents.ts

**Notes.** First row: A counted employer short of cash on payday records a wage shortfall and never draws its approved credit line, though the line has room.
