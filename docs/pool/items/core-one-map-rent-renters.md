---
id: core-one-map-rent-renters
title: "Rents match the sourced renter median and the income a renter is paid"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: one-map-rent3
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-05T20:47:12.689Z
---

**What.** Rents were 31 to 40 percent under the sourced renter median, and 58 percent of counted renters in Honolulu were charged the median rent on an income not yet recorded. Rent is now scaled by the renter median and by the income each counted household is paid.

**Rules.** One rule, all 56 places. One model, two tiers. Estimate, never UNKNOWN. No dice.

**Done when.** Nine drawn places and Honolulu run a year; rents match the sourced median; homeless counts compared with HUD before and after in the PR

**Files.** src/core2/modules/housing.ts, src/core2/modules/residents.ts, src/core2/data/housing/parameters.json

**Notes.** TODO
