---
id: tests-audit-report-fails-report-standard
title: "scripts/report-check fails on main: docs/reports/audit-2026-10-19.md breaks the report standard (lead, raw date, long sentence)"
area: docs
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/audit-report-standard
pr: #5303
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:53:01.855Z
---

**What.** `scripts/report-check/report-check.test.ts` fails on clean main in "measures every report written after the standard": docs/reports/audit-2026-10-19.md has a lead that holds code, pull request numbers and a clock time, a filename that reads as a raw date, and a 49-word sentence. The report's substance is sound, so the fix only moves the method paragraph to a closing Method section, opens with a plain-words lead, backticks the handoff filename and splits the long sentence. No finding, number or recommendation is changed.

**Rules.** This is a game, not a spreadsheet: a report for the owner follows the civic-reports standard (what changed first, then numbers, plain American English), and the checker is not weakened. No dice, no new facts: every sentence moved or split keeps its content.

**Done when.** `npm run report:check -- docs/reports/audit-2026-10-19.md` lists no error and `scripts/report-check/report-check.test.ts` passes in a test run on the changed branch, shown by the changed-file checks named at the top of the pull request.

**Files.** docs/reports/audit-2026-10-19.md, scripts/report-check/report-check.test.ts

**Notes.** Found Oct 19 by running scripts/ on clean main: 644 tests pass and two fail. The other, scripts/dev-lab/e2e-shard-inventory.test.ts, is the live Playwright case that #4309 deletes.

Oct 20: PR #5303 merged to main: the Oct 19 audit report meets the report standard.
