---
id: gov-ordinance-rows-estimate-flag
title: "Ordinance rows are marked sourced although their date is a tunable delay, and the changes screen shows no one reached"
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

**What.** Defect 24: `enactLaw` (`src/core2/modules/laws.ts`) writes every enacted row with `estimate: false`, though a local ordinance's effective date comes from a tunable delay. And the bench's "what changed" screen (`src/bench/changes.ts`, `lawsTook`) showed 0 people reached for all three county laws in the audit. Mark a row an estimate when its effective date is not from the bill's own text or the place's law, with the delay's source, and make the screen list the people the law's reach rows name.

**Rules.** An effect is a read, not a record. Ask why: the cause is named by file and line, or \"not found\". No dice. One rule, all 56 places. Replace, never layer.

**Done when.** In a drawn place (named, with seed) a county ordinance's law row is marked as an estimate with the delay's source when its date is the tunable delay, and the changes screen lists at least one named person reached by a county law that reaches anyone, by reach row id. Tests in src/core2/laws.test.ts and a bench test.

**Files.** src/core2/modules/laws.ts, src/bench/changes.ts

**Notes.** From `docs/reports/stress-audit-laws-2026-10-14/README.md`, defect 24. Verify against main before starting; the audit ran on the Oct 14 build.
