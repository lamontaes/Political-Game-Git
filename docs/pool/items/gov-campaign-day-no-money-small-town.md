---
id: gov-campaign-day-no-money-small-town
title: "Campaign day raises no money from reachable people (Putney, Vermont)"
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

**What.** `src/core2/campaign-day.test.ts` ("offers a handful of record-read choices and runs them through the engine") fails in Putney, Vermont with `GOLDEN_PATH_SEED=f2ce262b2ecc6a8fddd5f5bbb741ba8331863c2165301b29fd8c1c5ab2118996` (place seed `ad00e15b653e44cbf62725ec4368a8570c17b8e246fc72d77442ca1a52a840e0`): money raised from reachable people is 0. Find why no reachable person gave in that town and fix it at the root.

**Rules.** No dice: the reach comes from who lives in the town and the outlet's followers, never a roll. One rule for all 56 places: the fix reads the town's data, naming no place.

**Done when.** The test passes in Putney, Vermont with that seed and in a handful of other random places, and the PR body names the cause by record id.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/campaign-day.test.ts

**Notes.** Found while moving campaigns onto counted columns (#4735). It fails the same way on the code before that change, so it is older. A second failure in Sturgis, Mississippi (place seed 6f832f1481434e889dddb073aafe8c891c2cecce998cd68a19368c5c3e0870f2) looked the same.
