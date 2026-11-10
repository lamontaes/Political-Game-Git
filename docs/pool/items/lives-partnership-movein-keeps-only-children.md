---
id: lives-partnership-movein-keeps-only-children
title: "A partner moving in can leave a household with only children (crash at Ripley TN, year 4)"
area: people
kind: bug
priority: 1
size: S
status: dropped
lead: lives
claimed-by:
pr:
blocked-on:
source: Money, Nov 8; found running scripts/money/outside.ts
---

**What.** `npx tsx scripts/money/outside.ts money-1 4 4763340` (Ripley, TN, seed money-1) throws in year 4: "Invalid household change: household_808e92afb668300f would keep only children" at `state.ts:1783` (`changeHouseholdV1`), called from `partnerships.ts:586` (`moveIn`). A move-in that takes the last adult out of a household must keep an adult with the children (or move the children with them); today it stops a played world. The player would meet it as the game crashing during a time jump in a town where a parent moves in with a new partner. The fix belongs in the move-in rule, so that every partnership move-in in every place keeps the children with an adult.

**Rules.** No dice; one rule for both tiers; all 56 places.

**Done when.** The same run (Ripley TN 4763340, seed money-1, four years) completes, and a test at that place and seed shows the household's children kept with an adult after the move-in.

**Files.** src/core2/modules/partnerships.ts, src/core2/state.ts

**Notes.** Money filed this from a branch because `npm run pool -- add` hung for over half an hour on the push to main (GitHub's machines are full, per the Coordinator). Not started.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. `canLeave` in src/core2/modules/partnerships.ts (line 489) now requires that whoever is left on the household's books, the dead included, holds a living adult (its comment names Ripley, Tennessee, year 4), and `moveIn` (line 567) calls it for both partners before changing the household; the fix is commit a3d22ca6fd. The Ripley TN 4763340 / money-1 run is the item's own repro and was not rerun in this pass.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
