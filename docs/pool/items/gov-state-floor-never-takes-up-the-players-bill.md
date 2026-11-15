---
id: gov-state-floor-never-takes-up-the-players-bill
title: "A State House bill the player drafts says the floor takes it up on a date, then stays drafted"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: filed by hand on branch claude/project-thread-xy4wd4 (cluster 13, PR #9308)
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** A State Representative drafts a bill, the paper says "The floor takes it up on February 10, 2025", the player plays the days past that date and into April, and the bill is still drafted with no committee and no floor result. The player never sees their own state bill voted. Seen: on the bill paper's "Where it is" line and its Staff and vote boxes, which stay open through April 7 at Holiday Lakes, Texas.

**Cause.** Measured: at Holiday Lakes, Texas, seed aa11, playing Aaron Powers (State Representative), `node scripts/play-walks/fee-bill.mjs` drafts HB 2 on January 20, 2025 and plays the days to April 7; `/api/bill/stage` then reads status "drafted", stage "drafted", committees [] and floor []. It reproduces on the clean Train head ff9703d7 with a sales-tax bill (series:sales-tax, no fee series involved) at the same place and seed, so it is not caused by fee bills. `floorQueue` and `chamberBills` in src/core2/modules/world-legislating.ts leave out any bill that already has a vote on the calendar (`!calendar.get(voteKeyOf(b))`), so the player's bill, which the paper dates Feb 10, is read by no floor week; dev mode's hold-vote route does run it (passed 85 to 65).

**Fix.** Find which engine holds the calendar vote the paper names, and make the floor day it announces take the bill up and run committee, floor and desk by the one path the floor weeks use; delete any second route. Prove it by playing a drawn place and seed past the floor date and reading the stage.

**Time box.** 4 hours for one opus session.

**Rules.** No dice. One engine for every chamber and place; pinned places and fixed seeds in the test.

**Done when.** A second session drafts a state bill at a place and seed it did not choose, plays the days past the date the paper names, and sees the bill reach committee and a floor result by name in the running game, with the drawn place and seed written down and the bill's record id on the stage view.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/bench/legislature.ts

**Notes.** Found while replaying the State House fee walks for PR #9308; the second reader noticed the walk ran past the floor date. The walk's later Politics tab click timed out on four of the five State House runs on this branch (a scene, "Meghan Hill is waiting for you downtown", sat over the tab) and not on the Train run; not diagnosed further.
