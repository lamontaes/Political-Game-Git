---
id: campaign-door-pledge-turnout-total
title: "People who said yes at the door turn out no more than their neighbors: 17% of 18 against 19% of 36 in a played race"
area: elections
kind: bug
priority: 2
size: S
status: claimed
claimed-by: governing/pledge-turnout
pr:
blocked-on:
source: governing lead, Nov 1 (review of governing/door-pledge-test-by-seed)
lead: governing
claimed-at: 2026-11-04T00:18:41.670Z
---

**What.** `doorPledgeTurnoutWeight` (0.7, ESTIMATED, src/core2/data/campaigns/parameters.json) says it lifts a voter at a 10% local-election propensity to about half, inside the 46% to 87% that stated intent predicts. Its source says this is "checked as a total, the turnout of a played race's pledgers against its other adults (src/core2/door-pledge.test.ts)", but that check had been dead since #6912 (it mapped `voterId` over a list of id strings). Made live on Nov 1, it failed: in 1717939 (seed dp-fresh-1) 0.17 of 18 pledgers voted against 0.19 of 36 other adults. Find why the pledge reason does not lift the pledgers' turnout as a group (who the canvass reaches, the reason's size on the turnout scale, or the reason not being read on the day), fix it at the cause, and bring the total check back.

**Rules.** No dice: turnout follows each voter's own reasons; real rates check the total, never one voter's draw. One model, two tiers: the counted records' pledges are read by the same rule. Estimate, never UNKNOWN: the band is the cited 46% to 87%.

**Done when.** src/core2/door-pledge.test.ts asserts the total again: over a played race in at least three drawn places named with their seeds in the PR body, the pledgers' turnout sits inside the parameter's cited band and above the other adults', and the parameter's source text quotes the figures read.

**Files.** src/core2/turnout.ts, src/core2/modules/voting.ts, src/core2/data/campaigns/parameters.json, src/core2/door-pledge.test.ts

**Notes.** Found by the door-pledge test round (governing/door-pledge-test-by-seed, Nov 1); the per-voter check (a voter who voted on a held yes carries the pledge turnout reason) stays in the test meanwhile.
