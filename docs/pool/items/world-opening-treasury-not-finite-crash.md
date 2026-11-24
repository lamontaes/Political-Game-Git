---
id: world-opening-treasury-not-finite-crash
title: "New game crashes in some places: the opening treasury writes a non-finite amount"
area: world
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: lane-2/zero-opening-cash
pr: #7222
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T08:58:57.919Z
---

**What.** buildBenchWorld throws 'Module data must be finite, acyclic JSON data.' from openBudgets (src/core2/modules/budgets.ts:481, government -> table put, via fundOpeningTreasury) in Checotah, Oklahoma (4013650), place seed 47b06e171d253ce7139d26b0df3defc6376e0d99ab8022cebfbba3ff5d28b8dc (stops-answerable run seed 1acc04b6572d6ef2474607b73d0e7066b70ba9bcf5c519202b24a8c654ed707e), on main 3fd359c4, and earlier in Queen Creek, Arizona (0458150, place seed 0f8a85fc89c1c5dc73373d24937c5a222de8a65fcf261869cceaf4a56ba33cbf), which built on a later main. A new game in such a place crashes before it opens.

**Rules.** Owner's ruling 2 (Nov 3): the one check before merging is that a new game opens and runs briefly without crashing. Estimate, never UNKNOWN: a missing estimate is the average with a spread, not NaN.

**Done when.** buildBenchWorld builds Checotah, Oklahoma at the place seed above and the opening treasury of every government in it is a finite amount; a test draws places from all 56 and asserts every opening treasury is finite.

**Files.** src/core2/modules/budgets.ts

**Notes.** Filed by Lane 3 (Nov 4). Lead: Lane 2 (world-government-opening-fund-balance, opening treasuries).
