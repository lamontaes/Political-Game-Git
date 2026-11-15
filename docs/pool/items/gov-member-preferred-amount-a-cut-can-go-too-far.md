---
id: gov-member-preferred-amount-a-cut-can-go-too-far
title: "A member wants an amount, not a direction: a cut can go too far for someone who wanted a small one"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-bills-on-one-question-differ-only-by-direction
blocked-on:
source: Coordinator's ruling Nov 15 2026 01:40Z, from the bargaining thread's finding that a member weighs a figure only by its direction
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** A member's stance on an amount section (a tax rate, the minimum wage) is read as for or against the direction the figure moves. A member who wants the income tax a little lower backs a bill that sets it to 0 as firmly as one that sets it to 4.0, and so does the town. Real lawmakers and voters back a change up to the amount they want and oppose one that overshoots it. Seen: on the state floor, where an amount bill that goes much further than the chamber wants passes on the same votes as a modest one, and in the reasons a colleague gives when asking for a vote.

**Cause.** Found in code: `provisionStance` in src/core2/modules/legislature.ts reads an amount section as `sign(value - current) * raiseIs`. A member's view on the question it maps to (`seriesQuestion`) is a lean for or against, with no amount it points to. The sliding scale planned in gov-bills-on-one-question-differ-only-by-direction makes a bigger change weigh more, but still cannot make a change weigh less for going too far.

**Fix.** Give each member and voter group a preferred amount per amount series: their view on the mapped question placed between the lowest and highest amounts the states hold on the day (starting-law rows, all 56), or what the change does to their own pay, bills and district where an engine computes that. A section is weighed by how much closer it brings the law to that amount: |current - preferred| - |value - preferred|, scaled as the sliding scale is. The one stance reader changes, never a second one beside it.

**Time box.** 6 hours.

**Rules.** No dice: the preferred amount comes from the person's views and records, never a roll. One rule, all 56 places: the range comes from data, never a named state. Sliding scales and causes: nothing flips at a threshold. Speed: year time within 20 percent of its base at three named places with fixed seeds.

**Done when.** A second session runs a played year at Nathrop, Colorado (seed 612deadbcae7ad23) and two more named places with fixed seeds, then at one drawn place with its seed written down. In dev mode it sees a member who backs a small cut in a figure and opposes a larger cut of the same figure, with their position on each bill by record id. It also sees the count of votes that changed against the same world without the change.

**Waits on.** gov-bills-on-one-question-differ-only-by-direction (the sliding scale for amounts), and the voters' views thread's answer on whether views of an amount already come from a person's own life.

**Files.** src/core2/modules/legislature.ts

**Notes.**
