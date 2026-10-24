---
id: tests-outcome-news-guam-missing-rent-fact
title: "Outcome-news month-facts test fails on main in Santa Rita Guam"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #5879
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The existing month-facts outcome-news test fails on clean main in Santa Rita, Guam. Its February event exists but lacks the rent fact that the test requires after shifting the prior web row. This reproduces with OUTCOME_NEWS_SEED=3483bea3d0727b46, independently of PR 5879 and its new stance reader.

**Rules.** Wire to the world: keep positive month, printed-story and known-fact assertions rather than weakening them to tolerate absent rent. One rule, all 56 places: retain this Guam regression beside a fresh drawn-place case and report the real producer records.

**Done when.** The complete outcome-news.test.ts file passes on seed 3483bea3d0727b46 and a fresh drawn place, with positive rent-change and month-fact witnesses; a missing monthly rent fact still makes the regression fail.

**Files.** src/core2/outcome-news.test.ts, src/core2/outcome-news.ts, src/core2/modules/outcome-web.ts

**Notes.** Merger 3 reproduced on clean main plus only pool Notes (source main 4686078233). The isolated existing records-a-month test fails in 50.1 seconds at line 89, expected f[webFactKey(RENT)] truthy but got undefined. Same failure at line 187 of PR #5879; the new rent-year test also fails there separately.

Sent back 2026-10-24 from PR #5879 (branch claude/affectionate-clarke-7dknew): PR remains unmerged because its primary item explicitly requires the deferred counted-reader stance path; Guam shift repair is present and no fresh regression failure is claimed; finish on that branch, merge main into it first.
