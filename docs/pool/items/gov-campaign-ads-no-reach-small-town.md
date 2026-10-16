---
id: gov-campaign-ads-no-reach-small-town
title: "Campaign ad buy reaches nobody in a small town (Guilford, Maine)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found in #4735, Oct 16
---

**What.** `src/core2/campaign-ads.test.ts` ("is bought from the town's outlet and reaches its followers") fails in Guilford, Maine with `CAMPAIGN_ADS_SEED=55b534119efcf080`: the ad buy reaches 0 people where the test expects 50,000. Find why the buy reaches nobody in that town (no outlet followers, or followers not counted as reachable) and fix it at the root.

**Rules.** No dice: the reach comes from who lives in the town and the outlet's followers, never a roll. One rule for all 56 places: the fix reads the town's data, naming no place.

**Done when.** The test passes in Guilford, Maine with that seed and in a handful of other random places, and the PR body names the cause by record id.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-ads.test.ts

**Notes.** Found while moving campaigns onto counted columns (#4735). It fails the same way on the code before that change, so it is older.
