---
id: core-speed-world-campaign-days-as-group-results-part-3-asks-endorsements-by-group
title: "Donation asks and group endorsements use the group results"
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

**What.** A world campaign's donation asks and group endorsements are decided person by person. Read them from the group impression of part 1 by the same rule as a person, times the count, so a group's donations and endorsement are one result. This is part 3 of core-speed-world-campaign-days-as-group-results. Feeds: core-speed-world-campaign-days-as-group-results.

**Cause.** Design: docs/speed/off-screen-campaigns-as-results.md, stage 3. Measured (Speed, Nov 9): in Gunnison, Utah (4932660, seed n8f6) year 4, world campaigns took 25 s, of which day choices 7.0 s (`takeCampaignDayChoice`, src/core2/campaign-day.ts line 824) and group endorsements are per-person decisions by unwatched people.

**Fix.** Make asks and group endorsements read the group impression for members without a row of their own, and keep the player's circle, focus and officials individual.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus and officials stay individual; the player's own campaign is untouched. One model, two tiers: a group is read by the rule a person is, times its count. No dice. Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time.

**Done when.** A second session, not the builder, plays a drawn place, Gunnison, Utah (key 4932660, seed n8f6), for four years in the played world: the donations and endorsements for a world candidate come from group results, shown by record id, and a test shows group impression times members equals the sum of the members' reads within rounding.

**Waits on.** core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group.

**Files.** src/core2/campaign-day.ts, src/core2/modules/campaigns.ts, src/core2/hearer-groups.ts
