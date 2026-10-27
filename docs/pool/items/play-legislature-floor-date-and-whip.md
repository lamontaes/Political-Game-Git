---
id: play-legislature-floor-date-and-whip
title: "A bill the player drafts in a legislature or Congress shows its floor date, the whip count and the result on the legislature screen"
area: play
lead: play-first
milestone: play-first
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on: laws-floor-takes-every-chamber-bill
source: The screen half of laws-player-bill-reaches-the-floor (laws-and-effects lead, Oct 27; the owner's Oct 26 playtest, relayed by the CTO)
---

**What.** In the owner's Oct 26 playtest his H.R. 1 sat drafted a year. `seatAct` in `src/bench/legislature.ts` (around lines 215-219) gives a bill an agenda date only when its body has a regular meeting, so a chamber's bill shows no date. Once laws-floor-takes-every-chamber-bill is on main, the screen reads `floorDateOf(api, billId)` for the floor date, `whipCount(api, billId)` for each chamber's members for, against and undecided, and the bill's status and `votesOn` after the vote. The drafted-only branch goes.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: the date, the count and the result are record data, worded through the English engine's labels (`player-screen-text`), never raw ids or ISO dates. Replace, never layer: the agenda-date-only branch is replaced.

**Done when.** In the bench, a player seated in the state legislature and one seated in the U.S. House each draft a bill; the legislature screen shows its floor date, then the whip count the day before, then the result after the floor week, and a screenshot of each step is in the PR body.

**You will see.** A bill you draft in the legislature or in Congress shows the day the floor takes it up, how many members are for and against it the day before, and how the vote came out.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Time box.** 2 hours, one lane agent with the Words session's review.

**Files.** src/bench/legislature.ts, the legislature screen under src/bench

**Notes.** Filed by the laws-and-effects lead, Oct 27. The core readers land with laws-floor-takes-every-chamber-bill.
