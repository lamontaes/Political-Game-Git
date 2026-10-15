---
id: gov-ordinance-rows-estimate-flag
title: "The changes screen lists the people a county law reaches"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from gov-next-from-the-audit-this-lane (laws stress audit, defect 24)"
---

**What.** Defect 24 had two halves. The first is fixed (claude/gov-audit-triage): an ordinance's law row is now marked an estimate and cites the tunable delay (`ordinanceEffectiveDays`) its effective date rests on. The second remains: the bench's "what changed" screen (`src/bench/changes.ts`, `lawsTook`) showed 0 people reached for all three county laws in the audit. Check why `reachedBy(api, series, lawId)` finds no rows for a county ordinance (the log fact `lawId` or `series` may not match the reach rows' key), and make the screen list the named people a county law's reach rows name.

**Rules.** An effect is a read, not a record. Ask why: the cause is named by file and line, or \"not found\". No dice. One rule, all 56 places. Replace, never layer.

**Done when.** In a drawn place (named, with seed) the changes screen lists at least one named person reached by a county law that reaches anyone, by reach row id, and a bench test covers it.

**Files.** src/bench/changes.ts, src/core2/law-reach/host.ts

**Notes.** From `docs/reports/stress-audit-laws-2026-10-14/README.md`, defect 24. Verify against main before starting; the audit ran on the Oct 14 build.
