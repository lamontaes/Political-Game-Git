---
id: world-counted-renters-buy-build
title: "Build the counted renter purchase: PR 5367 for world-counted-renters-buy holds pool notes only, no code"
area: world
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** world-counted-renters-buy shows in-pr as PR #5367, but that PR changes two files (the item's notes and a declaration) and no source file, so the counted tier still cannot buy a home and world-stopgap-housing-construction-faked-mechanic stays gated on it. Build what the item's notes list as missing: an addFlowPart for a counted mortgage (counted mortgages are one merged flow per place and holder, a part per household, countedMortgageFlowId in housing-mortgages.ts), a counted down-payment source drawn from the group's account (counted-money.ts), and the bank-room check for a new loan; then give a counted renter household the same buy decision as buyHomes in src/core2/modules/housing.ts, times its count, ending its rent part and joining the mortgage flow. A counted household has no cash of its own, so its means need a stand-in registered as an owner-decision stopgap and written under OWNER DECISIONS NEEDED (read DECISION-REGISTER.md first).

**Rules.** One model, two tiers: a counted renter weighs buying with the same chooser and affordability read as a full one. No dice: who buys follows income against payment, means and traits. Speed: no scan of every counted renter each month. Every dollar balances: group cash, bank loans and the seller's account.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, place and seed named in the PR body) at least one counted renter household is shown by record id to leave its rent part, join the mortgage flow with a mortgage part, and appear as an owner, and the group's cash, the bank's loans and the seller's account balance to the dollar; a test in src/core2/housing.test.ts covers it and the town's ownership share is reported before and after.

**Files.** src/core2/modules/housing.ts, src/core2/residents-economy.ts, src/core2/housing-mortgages.ts, src/core2/counted-money.ts, src/core2/housing.test.ts

**Notes.** Found Oct 20 (claude/political-game-pool-yucp92-al): the diff of origin/claude/counted-renters-buy against main is two files, docs/pool/items/world-counted-renters-buy.md and a release note. Whoever owns world-counted-renters-buy can fold this item into it; until then this makes the work claimable.
