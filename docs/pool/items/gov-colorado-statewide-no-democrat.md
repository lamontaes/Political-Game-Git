---
id: gov-colorado-statewide-no-democrat
title: "Six statewide races at a Colorado town have no Democrat on the ballot, even with the party-nominee stand-in"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: governing
model: fable
effort: medium
source: Long game lane, Nov 17 (the presidency probe's runners-per-side count)
---

**What.** At Sedalia, Colorado (seed 4aeec7829faed41c, opened at the game's start and played to 2026-09-01) all six statewide races whose filing had closed had Republicans and no Democrat. It is the same on main (c5808caa) and on the presidency branch. The stand-in filed six times and the Democratic side stayed empty in each, so a Colorado player sees statewide races with one party on the ballot.
Seen: the statewide races on the ballot screen at a Colorado town.

**Cause.** Needs cause. Not yet traced: whether the stand-in's Democratic filing is refused on eligibility (`checkEligibility` in `fileNominees`, src/core2/modules/voting.ts), or `partyOnSide` names no Democratic party for Colorado, or Colorado's assembly route keeps the filing off the ballot.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: the fix names no state, city or place in its logic, only data.

**Done when.** A second session opens the ballot in the running game at Sedalia, Colorado (the seed above) and at two drawn Colorado places and sees a Democrat in each statewide race by its filing close; a test fails on main's code.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/candidacy.ts
