---
id: docs-five-reports-fail-report-standard
title: "Five committed reports break the report standard, which fails report-check.test.ts (npm run test:skill-ops) on main"
area: docs
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** scripts/report-check/report-check.test.ts 'measures every report written after the standard' fails on clean main (checked Oct 29 at origin/main 7f61eca116) with ten lines in five files. effect-web-wiring-2026-10-20.md:3 lead is 147 words. grade-reach.md:3 lead contains code, :5 raw date, :77 a 75-word sentence. law-wiring-table.md:3 raw date and a file path in the lead. scene-web.md:3 raw date and code in the lead, :9 a playtest report must open with the life as the player lived it. trait-wiring-2026-10-20.md:158 a 49-word sentence. Several are written by scripts (grade-reach-report.ts, npm run scene-web, the matrix regeneration), so the generator's template must change or the next run rewrites the fix. It is not in any workflow, only in the local gate.

**Rules.** Replace, never layer: fix the generator that writes the lead, not only the committed file. Never allowlist a report into WRITTEN_BEFORE_THE_STANDARD to get green. Reports follow civic-reports: what changed for the player first, numbers next, method last, American English.

**Done when.** npm run test:skill-ops passes on a branch that rewrites the five reports and the generators that write them, shown by running scripts/report-check/report-check.test.ts before and after, and by regenerating one report with its script and running npm run report:check on the output as a test of the template

**Files.** docs/reports/effect-web-wiring-2026-10-20.md,docs/reports/grade-reach.md,docs/reports/law-wiring-table.md,docs/reports/scene-web.md,docs/reports/trait-wiring-2026-10-20.md,scripts/report-check/report-check.test.ts

**Notes.** lead: docs. Found by the standing red-main owner Oct 29 19:35 UTC while gating the red-main skill PR (#6781). Read: OWNER-DECISIONS (report standard), searched docs/pool/items for report-check, report standard: docs-audit-oct19-report-standard (a different file) and tests-audit-report-fails-report-standard (done); no twin.
