---
id: words-paper-town-log-runs-in-one-outlet
title: "A town's police log runs in one outlet, its paper of record"
area: words
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9287
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

**Fix.** The town's paper of record is the town's outlet of record (`townOutlet`: its own newspaper, else its first local outlet; the first local outlet with a reporter living when that one has none). A brief kind listed under `recordOutletOnly` in briefs.json (`crime.month`) is that outlet's alone, and another outlet runs it only in a month the wire item marks `busier`: the town's usual rests on at least `briefUsualMinMonths` closed months and chance gives a month this busy less than `briefChanceBar` of the time at that usual (coordinator ruling Nov 14, 17:27Z: four reports against a usual of two is chance, not news). The log runs once: when the record changes hands (its reporters die or leave) after another outlet has printed a month's log, the new record does not print it again. That outlet's wording comes from its own turn. No new tracking table.

**Time box.** 3 hours.

**Rules.** No dice; the outlet is chosen by the outlet record, never a draw; the bar for a month well over usual is the ruled chance bar (`briefChanceBar`, one month in twenty), read from the town's own crime months; the slide of space stays `briefUsualFloor` and `briefUsualCeiling`.

**Done when.** In the running game, in three drawn places with more than one outlet, a second session opens News in each outlet and counts: the paper of record prints the town's log every month, and the other prints it only in a month well over usual.

**Waits on.** words-paper-police-log-slides-with-the-towns-usual (the usual and the share of space).

**Files.** src/core2/press-desk.ts,src/core2/modules/press.ts,src/core2/data/press/parameters.json
