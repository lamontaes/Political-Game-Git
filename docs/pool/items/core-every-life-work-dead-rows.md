---
id: core-every-life-work-dead-rows
title: "The working-life rows of people living elsewhere end at their death"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The jobs engine's review of people living elsewhere (src/core2/jobs-elsewhere.ts, PR #7049) keeps one row per person in jobs.elsewhere and never removes it, so a dead person's row stays for good. Over a long save the table grows with the dead instead of holding only the living.

**Rules.** Speed: years 97 to 100 hold at most 1.2 times the records of years 1 to 4, so a table must not grow with history once no reader needs the rows. One engine per mechanic: the jobs engine removes its own rows on the death event, as the partnerships module does (PR #7082).

**Done when.** In a generated world of a place drawn from all 56 with the health engine installed, after a year jobs.elsewhere holds a row only for living people (src/core2/jobs-elsewhere.test.ts), and the speed lead's long save shows the table flat over years.

**Files.** src/core2/jobs-elsewhere.ts, src/core2/modules/jobs.ts, src/core2/jobs-elsewhere.test.ts

**Notes.** Filed by the lives lead, Nov 1, after the speed lead's question on #7082; after #7049 merges.
