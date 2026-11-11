---
id: world-homeless-puerto-rico-far-above-hud
title: "A Puerto Rico town's homeless count runs about 75 times the HUD rate"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #5792
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** housing-calibration.test.ts fails on main in place 7237336 (Puerto Rico, world seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8): after a played year 110 of 2,253 people are homeless (488 per 10,000) against HUD's 6.5 per 10,000 for Puerto Rico. Every renter household starts above the 32 percent rent-burden line (188 of 188), and 93 of them are taken to court. Later PR notes put the pinned case at 42 homeless (bisected to the merge of living-costs-arrears). The cause named in the sibling items is incomes without transfers: counted renters in Puerto Rico have no public transfers in their income, so the eviction path fires on households that a full household would carry.

**Cause.** Measured: src/core2/housing-calibration.test.ts in place 7237336 (Puerto Rico), world seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8: 110 of 2,253 homeless (488 per 10,000) against HUD 6.5 per 10,000; every renter starts above the burden line (188 of 188). The cause traced in world-counted-households-transfer-income is that householdIncome in src/core2/modules/residents.ts counts no transfers.

**Fix.** Land counted-household transfer income (world-counted-households-transfer-income), then re-measure the pinned world and three fresh draws with src/core2/housing-calibration.test.ts and explain any remaining homeless by their records.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the homeless count a Puerto Rico town shows, now about 75 times the real rate.

**Rules.** Estimate, never UNKNOWN: rents and incomes start from the territory's real averages. Wire to the world: the fix applies to all 56 places, not this town. One rule, all 56 places: no place named in logic. Real rates are reported beside the result and are never targets (owner, Nov 8).

**Done when.** A second session (not the builder) plays the pinned Puerto Rico world (place 7237336, seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8) and sees the year's homeless count reported beside HUD's rate with each homeless person's chain from income to eviction by record id, renter burdens on day one reported beside the territory's sourced rent-to-income share, and src/core2/housing-calibration.test.ts passing on three fresh draws from all 56 named in the PR body. On screen: nothing yet; it would show on Politics, Government, and nothing there reads it.

**Waits on.** world-counted-households-transfer-income.

**Files.** src/core2/modules/housing.ts, src/core2/housing-homeless.ts, src/core2/modules/residents.ts, src/core2/housing-calibration.test.ts

**Notes.** TODO

Sent back 2026-10-23 from PR #5792 (branch claude/pr-homeless-rent): the Done-when table explicitly leaves the renter-burden requirement Not met (72 percent versus the cited 37.5 percent); track the completed geographic-fallback slice separately while preserving the income/calibration acceptance as open; finish on that branch, merge main into it first.
Sent back 2026-10-26 from PR #5792 (branch claude/pr-homeless-rent): its pinned Puerto Rico case now ends with 42 homeless, not 0, on merged main; find what moved it, finish on that branch, merge main into it first.
Bisect Oct 27: the pinned case first fails at main bab77889d5 (merge of #4937 living-costs-arrears); passes at 27e6530abd.
