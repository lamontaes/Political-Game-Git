---
id: core-speed-montpelier-snap-scope-memory
title: "Montpelier runs out of memory in year 4 again since the SNAP scope change (4095b2fb)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: astra/snap-memory-scope
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-08T00:28:17.263Z
---

**What.** On current main Montpelier, Vermont (5046000, seed 5a1c0de7a11ce5e1) ran out of memory in year 4 (FATAL heap out of memory, exit 134), where on Nov 6 it finished four years (7.58 GB process). Years 2 and 3 now keep far more: relationships 77,839 (was under 60,000) at year 2 and 125,603 at year 3, the log 142,112 at year 2 (was 101,791), folded causes 103,686 (was 99,070) and 153,412 at year 3 (was 109,139). Commit by commit on year 1 alone (news.heard 26,820 before, 29,550 after): adcae6b5 is good and 4095b2fb is the first bad one.

**Rules.** Speed and memory: no year may keep what no engine reads; the owner's Oct 29 speed ruling; measure on the same machine, one process.

**Done when.** A four-year Montpelier run on main finishes under the 8 GB limit again with relationships and the log at or below the Nov 6 counts, and the PR names which table grew and why.

**Files.** data/research/laws/starting-law-2026/health-human-services.json,data/research/powers-catalog/question-powers.json,src/core2/laws-in-force.ts

**Notes.** State Sessions Nov 8. 4095b2fb (fix: preserve sourced SNAP scope and avoid repeated law sorting, PR law-levels-federal-rule-reversal) changed 6 lines of health-human-services.json, 7 of question-powers.json and laws-in-force.ts. Upper Witter Gulch is not affected (year 2 log 41,260 against 41,393). Bisect: adcae6b5 good (year 2 log 101,791, folded causes 99,070), b5ea1bd5 and 4095b2fb bad on year 1. A change to who is subject to a federal work rule probably moves many people at once; read which records grew (relationships, news.heard, the log) at year 2 and whether an engine reads them. Not caused by my folded-causes narrowing: it gave identical counts to plain main, so it was dropped.

Nov 8, later (State Sessions): the blame on 4095b2fb is for the trigger, not the cause. Dumping every table's row count at the end of year 1 on Montpelier at adcae6b5 (good) and 4095b2fb (first bad) shows the two worlds almost the same: the biggest differences are votes 18,892 against 19,309 (+417), news.heard 16,965 against 16,631, actCounters 13,669 against 13,558, relationships 25,450 against 25,476 (+26); no table moved by more than 2 percent. So the commit does not add a kind of record; it nudges the world onto a different course (a different race result or contact), and by year 2 that course keeps 3 times the relationships and 40 percent more log. Montpelier's memory is therefore path-dependent: one course finishes, another runs out. The fix is not in the SNAP rule; it is in what a large town's election year keeps whatever its course (relationships formed at rallies and doors, the event log, folded causes), and Montpelier should be run on at least two seeds before it is called fixed.

