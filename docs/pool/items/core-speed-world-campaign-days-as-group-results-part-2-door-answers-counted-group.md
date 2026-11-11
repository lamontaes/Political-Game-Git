---
id: core-speed-world-campaign-days-as-group-results-part-2-door-answers-counted-group
title: "Counted residents' door answers are one result per counted group"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group
blocked-on:
lead: speed
model: opus
effort: high
root: design-country-tier
source: split from core-speed-world-campaign-days-as-group-results in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Most people who open a world campaign's door are counted residents, who already take the counted path, so the unwatched-full-person doors branch did not pay. Make a counted group's door answer one result per group and candidate, read from the group impression of part 1, instead of one answer per household. This is part 2 of core-speed-world-campaign-days-as-group-results. Feeds: core-speed-world-campaign-days-as-group-results.

**Cause.** Design: docs/speed/off-screen-campaigns-as-results.md, stage 3. Measured (Speed, Nov 9): Gunnison, Utah (4932660, seed n8f6) year 4, `walkWith` (src/core2/modules/campaigns.ts line 1355) 5.8 s on main against 5.2 s with the unwatched doors branch, because most door openers are counted residents; their `doorAppealOf` (src/core2/modules/voting.ts line 1389) is 2.7 s.

**Fix.** Compute a counted group's `doorAppealOf` and `doorChoiceOf` once per group and candidate from the group impression, and have `walkWith` take the group result for counted openers.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus and officials stay individual; the player's own campaign is untouched. One model, two tiers: a group is read by the rule a person is, times its count. No dice. Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time.

**Done when.** A second session, not the builder, plays a drawn place, Gunnison, Utah (key 4932660, seed n8f6), for four years in the played world: `walkWith` falls in a paired profile, and race winners, shares and turnout are compared with the base and reported.

**Waits on.** core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/hearer-groups.ts
