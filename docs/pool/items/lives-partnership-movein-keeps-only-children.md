---
id: lives-partnership-movein-keeps-only-children
title: "A partner moving in can leave a household with only children (crash at Ripley TN, year 4)"
area: people
kind: bug
priority: 1
size: S
status: open
lead: lives
claimed-by:
pr:
blocked-on:
source: Money, Nov 8; found running scripts/money/outside.ts
---

**What.** `npx tsx scripts/money/outside.ts money-1 4 4763340` (Ripley, TN, seed money-1) throws in year 4: "Invalid household change: household_808e92afb668300f would keep only children" at `state.ts:1783` (`changeHouseholdV1`), called from `partnerships.ts:586` (`moveIn`). A move-in that takes the last adult out of a household must keep an adult with the children (or move the children with them); today it stops a played world.

**Rules.** No dice; one rule for both tiers; all 56 places.

**Done when.** The same run (Ripley TN 4763340, seed money-1, four years) completes, and a test at that place and seed shows the household's children kept with an adult after the move-in.

**Files.** src/core2/modules/partnerships.ts, src/core2/state.ts

**Notes.** Money filed this from a branch because `npm run pool -- add` hung for over half an hour on the push to main (GitHub's machines are full, per the Coordinator). Not started.
