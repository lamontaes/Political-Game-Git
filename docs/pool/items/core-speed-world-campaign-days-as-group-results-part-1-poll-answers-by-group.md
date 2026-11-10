---
id: core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group
title: "Polls of unwatched full people read the hearer group's impression"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: high
root: design-country-tier
source: split from core-speed-world-campaign-days-as-group-results in the pool redo, Nov 10, 2026
---

**What.** A poll of unwatched full people is a per-person answer. Add the group impression row per group and candidate (mean warmth, share who heard of them, share who know the platform) in src/core2/hearer-groups.ts, let `impressionOf` (src/core2/modules/campaigns.ts line 730) read the group for a member with no row of their own, and answer a world campaign's poll from it. This is part 1 of core-speed-world-campaign-days-as-group-results and the shape the other parts use.

**Cause.** Design: docs/speed/off-screen-campaigns-as-results.md, stage 3. Poll answers are built in src/core2/modules/campaigns.ts (`commissionPoll`, `answerPollReason`) one person at a time; polls took about 5 s of Gunnison, Utah's year 4 (key 4932660, seed n8f6).

**Fix.** Add the group impression row and its reader, use it in the poll answer for people with `hearsAsPerson` false, and add a test that a group impression times its members equals the sum of the members' warmth reads within rounding.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus and officials stay individual; the player's own campaign is untouched. One model, two tiers: a group is read by the rule a person is, times its count. No dice. Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time.

**Done when.** A second session, not the builder, plays a drawn place, Gunnison, Utah (key 4932660, seed n8f6), for four years in the played world: year 4's poll time falls in a paired profile, and town race winners, shares and turnout are compared with the base and reported. The sum test passes.

**Waits on.** core-speed-message-viewers-as-groups.

**Files.** src/core2/hearer-groups.ts, src/core2/modules/campaigns.ts, src/core2/modules/voting.ts
