---
id: words-paper-town-log-runs-in-one-outlet
title: "A town's police log runs in one outlet, its paper of record"
area: words
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: words-paper-police-log-slides-with-the-towns-usual
lead: words
model: sonnet
effort: medium
root: none
source: second words reader on #9227 (Nov 14); coordinator ruling Nov 14 13:39Z
checked: m3 2026-11-14
---

**What.** One town's month of police reports is printed by every outlet that covers the town, in near-identical words: 54 prints at Wendell, 126 at Creve Coeur and 174 at River Road over 16 months (played rows of /mnt/project-files/words-lead/paper/police-log-places.txt). A real town has one police log column. Ruling (coordinator, Nov 14): the town's log runs in one outlet, its paper of record; another outlet runs it only in a month well over the town's usual, and in its own words. Seen: News in a town with two outlets: the log appears in one paper each month, and in the second only in a month well over usual.

**Cause.** Measured: at River Road, Oregon (seed pl6) and Wendell, Idaho (seed pl1), run `npx vitest run src/bench/printed-police-log.test.ts` and read the PRINTED rows: the briefs column in src/core2/press-desk.ts is built per outlet from the same wire items, so each outlet prints every `crime.month` item its space allows (174 prints at River Road in 16 months, one per outlet per month).

**Fix.** The town's paper of record is the outlet whose home is the town with the longest standing (read from the outlet rows); an item that names a town (`crime.month` today, `usualSpace` already reads it) is a brief for that outlet only, and for another outlet only when its `vsUsual` share gives it a full share of space; that outlet's wording comes from its own turn. No new tracking table.

**Time box.** 3 hours.

**Rules.** No dice; the outlet is chosen by the outlet record, never a draw; the slide between the two is the existing `briefUsualFloor` and `briefUsualCeiling`, not a new threshold.

**Done when.** In the running game, in three drawn places with more than one outlet, a second session opens News in each outlet and counts: the paper of record prints the town's log every month, and the other prints it only in a month well over usual.

**Waits on.** words-paper-police-log-slides-with-the-towns-usual (the usual and the share of space).

**Files.** src/core2/press-desk.ts,src/core2/modules/press.ts,src/core2/data/press/parameters.json
