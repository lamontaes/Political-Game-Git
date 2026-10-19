---
id: people-abortion-provider-distance
title: "Miles to the nearest abortion provider come from the place, not two national averages"
area: people
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from people-unplanned-pregnancy-decision, Oct 19"
---

**What.** Replace the two national averages in renewalProviderMilesOpen and renewalProviderMilesRestricted with a sourced, place-level distance to the nearest provider for all 56 places, in data. Source it from a published provider-distance study and name its vintage. Close SG-PEOPLE-unplanned-provider-distance.

**Rules.** No dice. An effect is a read, not a record. One rule, all 56 places. One model, two tiers. No hand-written player text. Look before you ask: owner decisions are in SG-PEOPLE-unplanned-pregnancy.

**Done when.** In a place drawn from all 56 (name and seed in the PR body) decideUnplanned in src/core2/births-unplanned.ts reads that place's own miles, a test in src/core2/renewal.test.ts shows two drawn places with different miles, and the stopgap is resolved.

**Files.** src/core2/births-unplanned.ts, src/core2/data/renewal/parameters.json, src/core2/data/stopgaps.json

**Notes.** The first part (exposure, the decision, the law read) is in the people-unplanned-pregnancy-decision PR; see src/core2/births-unplanned.ts.
