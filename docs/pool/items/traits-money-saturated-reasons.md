---
id: traits-money-saturated-reasons
title: "Applying for a job, buying a home, an owner's draw and founding vary with circumstances so personality can turn them"
area: people
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/traits-money
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T15:42:11.072Z
---

**What.** In a played year four money decisions are settled by circumstances alone: every full job seeker scores the same unemployed need, nobody buys a home, every owner draws, and founding's market-room reason weighs about 6 against a trait lean held within -1 to 1. Personality turned none of them in the drawn year (business.found 46,674 calls, 0 turned). Give each decision reasons that differ between people (the seeker's own pay gap and search length, the renter's savings against a down payment, the owner's cash against a month of costs, the market room scaled to the founder's own money), then calibrate their weights with scripts/traits/trait-calibrate.ts.

**Rules.** No dice: the reasons are each person's own recorded circumstances, never a roll. Sliding scales: each reason grows smoothly with the circumstance, with no bar that flips the choice. Research before building: weights cite Kanfer 2001, Zhao and Seibert 2006 or keep a gap row.

**Done when.** scripts/traits/trait-wiring-audit.ts played, flat and mirror twins and trait-wiring-matrix.ts on one year of buildBenchWorld in two places drawn from all 56, seeds named, show jobs.apply, housing.buy-home, business.owner-draw and business.found with a turned share above zero and top-third against bottom-third pick rates beside their targets; src/core2/money-traits.traits.test.ts covers each.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/housing.ts, src/core2/modules/business.ts, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 24 by the traits lead from the money family's twin audit (place key 1515700, seed 6f7794a4906f). The traits-wire-money PR keeps these at the general weight with gap rows.
