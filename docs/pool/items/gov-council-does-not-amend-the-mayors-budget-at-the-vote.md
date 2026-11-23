---
id: gov-council-does-not-amend-the-mayors-budget-at-the-vote
title: "A council votes the mayor's budget as sent at every place the test draws"
area: gov
lead: laws
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 16 (found building laws-local-budget-amendments-need-a-recorded-cause)"
checked:
---

**What.** A council votes a mayor's budget exactly as sent, so the amendments the council's members want never reach the budget at the vote. Seen: the council's vote on the mayor's budget shows no changed lines.

**Cause.** Measured: with BUDGET_SEASON_SEED set, by `npx vitest run src/core2/office-day-budget-season.test.ts`, the amend case finds no council that amended the mayor's budget in 14 places: Ortley (4647660) seed ad21e095df9375889ae526b13cc8d8a0c45d0d59ba33c7f0bd3bb98e12f86348, Hideout UT (4935120) seed 06aaea98b2fdad3d6031503eaee628c17ef2b8d669a8872bc3ddeeb15ebc7d4e, Edinburg TX (4822660) seed d6556e078f9a22627eb871bd66267d64f7c14ca98dd68699fb1c9d907fdb0841, Rawlins WY (5663900) seed 76c9798f0eda7a4d18ac6868120f2d15656bf9f9cdb5c147a7dd8e7fb93dd9a0 and Climax MI (2616440) seed 83d3fbe0b04b8be913f50f611acabddc403bf324970fc54c043e76f2b43b9d88 each voted as sent with amendments empty. Whether the vote's own amendment step has stopped reading members' line positions, or the old test premise rested on mid-year amendments, is not yet found.

**Fix.** Read the budget vote's amendment step (the council's negotiation in src/core2/modules/budgets.ts and legislature.ts) at Ortley with the members' line stances in hand, say which it is, then make members' standing wishes act at adoption as the owner's rule says, or move the test to the premise the game keeps.

**Time box.** 4 hours for one Opus session.

**Rules.** Standing rule no-dice: whether a council amends a budget at its vote comes from members' stances and the money, never a roll. Standing rule wire-to-the-world: proven in a generated world at the places above.

**Done when.** At Ortley (4647660) and one more of the places above the council amends the mayor's budget at the vote or the item records why it should not, and a second session replays the amend case on main at a drawn place.

**Waits on.** laws-local-budget-amendments-need-a-recorded-cause (merged) so the mid-year path no longer moves lines.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/legislature.ts, src/core2/office-day-budget-season.test.ts

**Notes.** Filed Nov 16 on the branch of PR 9652.
