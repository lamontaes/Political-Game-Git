---
id: docs-law-wiring-report-long-reach-sentence
title: "Generated law-wiring table fails the report check on a 46-word reach explanation"
area: docs
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/law-table-long-sentence
pr: #6192
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T21:34:57.328Z
---

**What.** The report-check test fails on clean main because docs/reports/law-wiring-table.md line 524 contains a 46-word reach explanation. The same diagnostic appears on the job-offer branch, which does not change this report. Fix the generated explanation at its source and regenerate the table while preserving its legal meaning and every wiring grade. The playtest report's separate lead failure is already tracked by release-playtest-report-lead-commit-hash.

**Rules.** Keep it simple: split the explanation at its source and regenerate the report without changing any law grade or legal qualification. No dice: preserve the same evidence and do not weaken the report checker or add an exception.

**Done when.** The report-check test no longer reports the long sentence in docs/reports/law-wiring-table.md, and regenerating the report preserves the correction. Record the exact test result and retain all existing grades, evidence and legal qualifications; unrelated baseline findings remain separately tracked. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** docs/reports/law-wiring-table.md, scripts/law-wiring/matrix.ts, scripts/report-check/report-check.test.ts

**Notes.** Merger 3 reproduced the identical report-check diagnostic on clean main 491c10de4f and integrated #5971 at dcde7bf145 on Oct 25. The other report failure is already in #5988.
