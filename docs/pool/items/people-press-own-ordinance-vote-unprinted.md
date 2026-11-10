---
id: people-press-own-ordinance-vote-unprinted
title: "A council member's own ordinance vote goes unprinted when the week has other stories (Raynham Center, Massachusetts)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: world
source: story/bring-up-ordinance, failing draw GOLDEN_PATH_SEED=c8d4012d006c5ddc03f2 (Raynham Center, Massachusetts, world seed 906aa6257532a9c45956984506ecd1cffdffe91340ed7dafd366ee224e841553)
---

**What.** The player sits on the board of Raynham Center, Massachusetts, sponsors a property-tax-lower ordinance and it passes 5 to 2 on 2025-01-28, but the press never prints the vote: the stories table holds no story for the vote record (bill-vote on bill ...:person_8dc3803c25fca6d4:8), while the same board's sittings on 2025-01-21, 2025-02-04 and 2025-03-04 were each printed at 10 outlets. Nobody reads a story that does not exist, so none of the 323 press readers can bring up the ordinance, and the golden path "people bring it up" has nothing to say. Cause, read in src/core2/press-desk.ts `runDesk` (around lines 790 to 840): each reporter files at most `storiesPerReporterWeek` (2, src/core2/data/press/parameters.json line 198) stories from the open items, ranked by score; a lone sitting with one vote ties with the week's laws taking effect and other items on involvement, and ties break by item id, so a sitting can lose its week and, with `storyFreshDays` 14, ages out unprinted. The board's other single-vote sitting in the same run (2025-02-25) was also unprinted.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Wire to the world: the fix is in the desk's ranking or its coverage of a local body's own sittings (a local paper reports the town board's actions as a rule), never a typed exception for the player. One engine: change the desk, not a second printer.

**Done when.** In Raynham Center, Massachusetts at seed 906aa625 (GOLDEN_PATH_SEED=c8d4012d006c5ddc03f2), the 2025-01-28 vote on the player's property-tax ordinance has a printed story at the local outlets, and src/director/bring-up-ordinance.test.ts passes on that draw without skipping the candidate; the paper still prints no more than the outlet's weekly space.

**Files.** src/core2/press-desk.ts, src/core2/data/press/parameters.json, src/director/bring-up-ordinance.test.ts
