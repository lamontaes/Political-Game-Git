---
id: housing-day-one-rents-and-values-from-pay
title: "Day one's rents and home values come from each place's own pay, not the Census medians"
area: world
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by: claude/pins-housing-day-one
pr:
blocked-on:
after:
lead: world
source: Justice lane, Nov 17, 2026, family 25 of the CTO's LIFT THE PINS list (issue 9747, comments 6936897718 and 6936902790)
model: opus
effort: high
root: none
---

**What.** Every town opened with its county's published median rent and home value, moved once per world, so two worlds of one town opened alike whatever its people earned. The owner ruled on Nov 16 that everything comes from the simulation and nothing is pegged to real numbers.
Seen: the player's own rent and home value on day one in Housing.

**Cause.** Found in code: `withHousingAt` in src/core2/modules/housing.ts read `rentValueOf(town.county, input.seed)` and divided each rent and value by the renters' and owners' own median scale, so the town's median landed on the Census figure; `openHousing` then set the price level's scale from the same median.

**Fix.** `levelFromPay` in src/core2/modules/housing.ts sets a place's typical rent and typical home value from its households' median pay, with two fitted strengths and the world's own price path; `withHousingAt`, `openMissingHomes`, `rentHomeValue` and `openPriceLevel` read that level. `rentValueOf`, `publishedRentValueOf`, the county table and its fallbacks are deleted. The player sees a rent and a home value in Housing that follow the town's pay.

**Time box.** 4 hours for one top-model session at high effort.

**Rules.** No dice: a level is computed from pay records, never drawn around a figure. One rule, all 56 places: the same two strengths price every place and no place is named.

**Done when.** A second session opens a drawn place, Lafayette, Colorado (seed 3da19558bdb4a07c) or any other, and sees in Housing a typical rent near a fifth of the town's median household pay, and src/core2/housing-day-one-from-pay.test.ts passes on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/housing-price-level.ts, src/core2/housing-prices.ts, src/core2/data/housing/housing.json, src/core2/data/housing/parameters.json, src/core2/housing-day-one-from-pay.test.ts (new)
