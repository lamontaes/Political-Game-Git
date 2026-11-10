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
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group
---

**What.** A poll of unwatched full people is a per-person answer. Add the group impression row per group and candidate (mean warmth, share who heard of them, share who know the platform) in src/core2/hearer-groups.ts, let `impressionOf` (src/core2/modules/campaigns.ts line 730) read the group for a member with no row of their own, and answer a world campaign's poll from it. This is part 1 of core-speed-world-campaign-days-as-group-results and the shape the other parts use.

**Cause.** Needs cause. The earlier cause (poll answers built one person at a time from their impressions) is not where the time goes, measured by opus-d23b on main 42adc555b5 (PR #8263): in Gunnison, Utah (4932660, seed n8f6), year 4's 491 polls cost about 4 s, of which dialing (one `leanedYes` per person called, src/core2/modules/campaigns.ts `commissionPoll`) is 2.91 s, the frame (`pollFrame` filtering and sorting every full adult on every poll) 0.91 s, and the impression reads this Fix replaced 0.20 s. A finder decides between a group answer rate for dialing and a day cache for the frame's full-person part, both sketched on PR #8263, and whether the group impression row is still wanted for its own sake.

**Fix.** None until the cause is found.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus and officials stay individual; the player's own campaign is untouched. One model, two tiers: a group is read by the rule a person is, times its count. No dice. Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time.

**Done when.** A second session, not the builder, plays a drawn place, Gunnison, Utah (key 4932660, seed n8f6), for four years in the played world: year 4's poll time falls in a paired profile, and town race winners, shares and turnout are compared with the base and reported. The sum test passes.

**Waits on.** Nothing. (core-speed-message-viewers-as-groups, which it built on, is done.)

**Files.** src/core2/hearer-groups.ts, src/core2/modules/campaigns.ts, src/core2/modules/voting.ts

**Notes.** Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:03 UTC) on branch claude/pool-core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group.

Released (2026-11-10): Measured in Gunnison UT n8f6 year 4: polls cost 4.0 s, but 2.9 s is dialing (leanedYes per call) and 0.9 s the frame; the impression reads the Fix replaces are 0.2 s, so the Fix cannot make poll time fall (PR 8263). Continue on branch claude/pool-core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:41 UTC) on branch claude/pool-core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group.

Released (2026-11-10): Re-offered after opus-d23b released it with a measurement that the Fix cannot make poll time fall (PR 8263); marking its Cause Needs cause. Continue on branch claude/pool-core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group.
