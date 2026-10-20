---
id: world-player-year-no-contract-settlements-garyville
title: "A played year in Garyville, Louisiana settles no household contract: player-money-year fails on the contract-settlement line"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/player-year-settlements
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:10:05.483Z
---

**What.** GOLDEN_PATH_SEED=8ef6f174b538bfe5a528b8fd9f7a1fba2c4d50f11343a37f36749ae3fa570d02 GOLDEN_PATH_PLACE_KEY=2228345 npx vitest run src/core2/player-money-year.test.ts fails at src/core2/player-money-year.test.ts line 102: the player's household total for finance.contract-settlement outMinor is 0 over a played year, so no rent, bill or subscription is ever settled. Found Oct 20 on main while checking world-town-public-works-staff-never-paid (a different failure from that item: the payroll line passes here). Find which contract the household should settle and why none does in this place (a missing landlord, a contract that never comes due, or a settlement that posts under another kind).

**Rules.** Wire to the world: one dollar followed from the household to the payee by journal record id. No dice. One rule, all 56 places: no place named in the fix.

**Done when.** The command above passes, and the same test passes in three other random places with the seeds named in the PR body.

**Files.** src/core2/player-money-year.test.ts, src/core2/opening-finance.ts, src/core2/modules/finance.ts

**Notes.** TODO
