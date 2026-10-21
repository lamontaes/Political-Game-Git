---
id: world-player-year-no-contract-settlements-garyville
title: "A played year in Garyville, Louisiana settles no household contract: player-money-year fails on the contract-settlement line"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/garyville
pr: #5586
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T13:56:39.609Z
---

**What.** GOLDEN_PATH_SEED=8ef6f174b538bfe5a528b8fd9f7a1fba2c4d50f11343a37f36749ae3fa570d02 GOLDEN_PATH_PLACE_KEY=2228345 npx vitest run src/core2/player-money-year.test.ts fails at src/core2/player-money-year.test.ts line 102: the player's household total for finance.contract-settlement outMinor is 0 over a played year, so no rent, bill or subscription is ever settled. Found Oct 20 on main while checking world-town-public-works-staff-never-paid (a different failure from that item: the payroll line passes here). Find which contract the household should settle and why none does in this place (a missing landlord, a contract that never comes due, or a settlement that posts under another kind).

**Rules.** Wire to the world: one dollar followed from the household to the payee by journal record id. No dice. One rule, all 56 places: no place named in the fix.

**Done when.** The command above passes, and the same test passes in three other random places with the seeds named in the PR body.

**Files.** src/core2/player-money-year.test.ts, src/core2/opening-finance.ts, src/core2/modules/finance.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5571 (branch claude/player-year-settlements): the contract-settlement assertion now accepts generic residents debits and can pass while rent or mortgage goes unpaid; assert the route required by recorded tenure and contracts instead; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5586 (branch claude/garyville-contract-settlements): Merging current origin/main still conflicts in src/core2/player-money-year.test.ts. This stricter route-specific fix is worth keeping: main at that file:109 accepts a generic accounts.transfer residents debit when the contract proof is empty, which can hide unpaid rent or a mortgage. Resolve the code conflict while retaining the dwelling-based contract versus property-tax/arrears assertions, then rerun the pinned and drawn-place cases; this is not merely superseded by the broader main assertion.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5586 (branch claude/garyville-contract-settlements): The conflict repair keeps the stricter dwelling-based contract check and limits the outside-living fallback to places with no property-tax rate. The body still has no Done when evidence table required by merger skill section 2.5. Map the pinned Garyville case and drawn cases to the items actual route assertions, full seeds/places and payment or arrears record evidence; update Change to include the no-tax-rate fallback now present in the diff. No local gate pass is claimed here.; finish on that branch, merge main into it first.
