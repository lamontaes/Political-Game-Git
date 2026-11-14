---
id: housing-counted-rent-flow-moves-without-renewal
title: "A counted tenant's rent flow ends a played year far from its last renewal's rent, so something other than the renewal changed it"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
checked: Account lead 2026-11-14
source: Account lead T45, Nov 14 2026, red on the clean train 998ba95bf5 and on #9084 alike
---

**What.** `src/core2/counted-rent-transfer-read.test.ts`, "renews a counted tenant's rent by the same rule as a full tenant's lease", fails in Waverly, Virginia, COUNTED_RENT_SEED=a25cdbfcdbc7b6ef. On the clean train, `rent:household_e7ca6fd738fa4492` pays 92,558 cents a month while its last renewal row says 64,008; on #9084, `rent:household_282e1df2a7d797de` pays 92,269 against 64,865. A counted tenant's rent is set only by a renewal, so a 45% gap means a second writer changed it. Seen: the town's typical rent on Metrics and every counted renter's spending read the flow, so rents can rise in play without a renewal behind them.

**Cause.** Measured: Waverly VA, seed a25cdbfcdbc7b6ef, after the test's played year, on both the clean train and #9084. Not yet traced: the next session finds the writer. Candidates are `setResidentFlowAmount` calls on `rent:` flows outside `renewRentalLeases` (src/core2/housing-occupancy.ts), such as a move within town, a household split or a counted household's dwelling change, and whether the renewals row is rewritten when the flow is.

**Fix.** Trace the flow's amount through the year (dev Trace or a probe that logs every `setResidentFlowAmount` on that flow), name the writer by file and line, and make it go through the renewal rule or write the renewal row with the amount it sets. Then the test passes at that seed and two drawn seeds.

**Time box.** 3 hours for one Sonnet session; if the writer is not found in that time, write what was traced into the Notes and stop.

**Rules.** One model, two tiers: a counted tenant's rent changes by the same rule as a full tenant's lease. An effect is a read: one record of the rent, the one the renewal wrote.

**Done when.** A second session runs counted-rent-transfer-read.test.ts on main at COUNTED_RENT_SEED=a25cdbfcdbc7b6ef and two drawn seeds and sees each counted flow equal its last renewal row, naming place and seed.

**Waits on.** Nothing.

**Files.** src/core2/housing-occupancy.ts, src/core2/modules/residents.ts, src/core2/counted-rent-transfer-read.test.ts

**Notes.** Filed by Account lead T45 on its branch at the Account lead's request.
