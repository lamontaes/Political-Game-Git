---
id: docs-audit-oct19-report-standard
title: "The Oct 19 audit report breaks the report standard in five places, which fails report-check.test on main"
area: docs
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:38:43.263Z
---

**What.** The two audit reports in docs/reports (merge-audit-2026-10-20.md and post-merge-audit-2026-10-19.md) broke the report standard in seven places: "cancelled" spelled the British way, a clock time and a method word in the lead, and four sentences of 49 to 92 words. They failed scripts/report-check/report-check.test.ts on main. Reword each so the check passes without changing what the reports say.

**Rules.** Replace, never layer: the offending sentences are reworded in place, not added beside. American English. No finding is dropped or softened.

**Done when.** `npx vitest run scripts/report-check/report-check.test.ts` passes in the session and `npm run report:check -- docs/reports/merge-audit-2026-10-20.md` and the same for post-merge-audit-2026-10-19.md print zero errors, with the numbered findings of the merge audit all still present.

**Files.** docs/reports/merge-audit-2026-10-20.md, docs/reports/post-merge-audit-2026-10-19.md

**Notes.** Done Oct 20 in the same change that filed it: both files reworded, 27 report-check tests pass.
