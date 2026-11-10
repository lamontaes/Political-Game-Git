---
id: core-speed-world-campaign-days-as-group-results-part-4-proof-across-places
title: "Prove the group results in three drawn places over four years"
area: core
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: core-speed-world-campaign-days-as-group-results-part-2-door-answers-counted-group, core-speed-world-campaign-days-as-group-results-part-3-asks-endorsements-by-group
blocked-on:
lead: speed
model: sonnet
effort: medium
root: design-country-tier
source: split from core-speed-world-campaign-days-as-group-results in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** After parts 1 to 3, prove the whole change: four-year runs of Gunnison, Utah (key 4932660, seed n8f6) and two other drawn places, the branch against its base in alternating pairs in both orders. Report year 4 seconds and the outcomes. This is part 4 of core-speed-world-campaign-days-as-group-results.

**Cause.** Design: docs/speed/off-screen-campaigns-as-results.md, stage 3. The proof is the one the design asks for under its Proof heading; the earlier doors-only branch was inside the noise (159.3 against 143.3 s and, reversed, 134.6 against 141.7 s).

**Fix.** Run `npm run speed:year` for the three places, alternating base and branch in both orders, and compare race winners, shares, turnout and stance spreads; write the table in the PR body.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus and officials stay individual; the player's own campaign is untouched. One model, two tiers: a group is read by the rule a person is, times its count. No dice. Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time.

**Done when.** A second session, not the builder, repeats the pairs in a drawn place it chose: year 4 is faster on the branch in both orders, and the table of race winners, shares, turnout and stance spreads is in the PR body.

**Waits on.** core-speed-world-campaign-days-as-group-results-part-2-door-answers-counted-group and core-speed-world-campaign-days-as-group-results-part-3-asks-endorsements-by-group.

**Files.** scripts/speed-years/run.ts, scripts/speed-years/compare.ts
