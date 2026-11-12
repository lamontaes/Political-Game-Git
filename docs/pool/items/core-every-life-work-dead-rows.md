---
id: core-every-life-work-dead-rows
title: "The working-life rows of people living elsewhere end at their death"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-core-every-life-work-dead-rows
pr: #8364
after:
blocked-on:
source: added with npm run pool -- add
lead: lives
standard: 2
model: sonnet
effort: low
root: rc5-full-detail-every-day
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:01:04.463Z
---

**What.** The jobs engine's review of people living elsewhere (src/core2/jobs-elsewhere.ts, PR #7049) keeps one row per person in jobs.elsewhere and never removes it, so a dead person's row stays for good. Over a long save the table grows with the dead instead of holding only the living. The cause is that the review only reads people who are alive and never hears of a death, so nothing removes the row; the partnerships module drops its row on the life.death event, and the jobs engine should do the same.

**Cause.** Found in code: src/core2/jobs-elsewhere.ts keeps one row per person in `WORK_ELSEWHERE_TABLE` (line 53) and never removes it; the review reads only living people and never hears of a death, while src/core2/modules/partnerships.ts drops its row on the "life.death" event (line 949).

**Fix.** Remove the jobs.elsewhere row on the life.death event, as the partnerships module does.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Speed: years 97 to 100 hold at most 1.2 times the records of years 1 to 4, so a table must not grow with history once no reader needs the rows. One engine per mechanic: the jobs engine removes its own rows on the death event, as the partnerships module does (PR #7082).

**Done when.** A second session, in a generated world of a drawn place (place and seed named) with the health engine installed, runs a year and sees jobs.elsewhere hold a row only for living people, by src/core2/jobs-elsewhere.test.ts, and sees the speed lead's long save show the table flat over years.

**Waits on.** Nothing.

**Files.** src/core2/jobs-elsewhere.ts, src/core2/modules/jobs.ts, src/core2/jobs-elsewhere.test.ts

**Notes.** Filed by the lives lead, Nov 1, after the speed lead's question on #7082; after #7049 merges.
