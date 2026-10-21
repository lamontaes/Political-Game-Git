---
id: world-housing-counted-rent-arrears
title: "A counted renter that falls behind is filled in and owes arrears under the same legal steps as a full renter"
area: world
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/counted-rent-g08lgv
pr: #5222
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:30:16.010Z
---

**What.** Counted renters pay rent from their place's pooled residents account with no household arrears of their own, so a single counted household can never fall behind (stopgap SG-WORLD-housing-counted-rent). Replace the pooled flow with each counted group's own income against its own rent, filling the household in as a full person when it falls behind, so arrears and eviction follow the same legal steps as for a full renter. The fill-in item world-fill-in-arrears-from-household covers what a filled-in household carries.

**Rules.** One model, two tiers: a counted renter pays and is evicted under the same rule as a full one, times its count. No dice: who falls behind follows income against rent and the place's conditions, never a fixed share. Wire to the world: money moves only through the accounts API and every dollar balances.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) a counted household whose income falls short of its rent is shown by record id as behind on rent, filled in, and in an eviction case, and the town's pooled account no longer pays that rent. The test in `src/core2/housing.test.ts` and the stopgap tripwire show SG-WORLD-housing-counted-rent resolved in `src/core2/data/stopgaps.json`.

**Files.** src/core2/modules/housing.ts, src/core2/data/stopgaps.json, src/core2/housing.test.ts

**Notes.** The pooled flow is in housing.ts at about line 473 (`rent:<household>`). Related: PR for world-fill-in-arrears-from-household.
