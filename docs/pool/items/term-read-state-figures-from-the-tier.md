---
id: term-read-state-figures-from-the-tier
title: "A state's term is read from the country tier's kept months, like Metrics and the agenda"
area: gov
kind: bug
priority: 3
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9796
after: metrics-state-figures-one-owner
blocked-on:
lead: nation
model: sonnet
effort: medium
root: none
source: Account lead thread, Nov 15, after metrics-state-figures-one-owner
---

**What.** After the country tier became the one keeper of each state's unemployment, jobs, pay, prices and people by month, a state's term-read (how a state moved over a governor's or legislature's term) still reads the regional module's months, weighted by region population, as the state. A term already under way at the opening reads from the web's real coarse months, which the tier does not hold before its opening month, so the two cannot simply swap. Seen: a state term's labor, wage and price reads next to Metrics' state rows for the same state and month.

**Cause.** Found in code: `stateRowAt` (src/core2/term-read.ts) filters the regional months by state and calls `stateFigures` (src/core2/regional-model.ts), the regions' population-weighted sum, while Metrics, the state agenda and the working lives elsewhere read `countryStateMonth` (src/core2/modules/macro.ts), the country tier's kept month.

**Fix.** Read a state's months since the opening from the tier's kept rows (`countryStateMonth`: the last year in full, each December and the opening month); for months before the opening, read the opening's real coarse rows (`openingRegionMonths`) once, as the tier is fitted from them, so the two meet at the opening month. Then `stateFigures` in regional-model.ts has one reader left, the tier's own opening, and takes a name that says so.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the tier writes the state's figures once and every view reads that row. Replace, never layer (owner, Oct 14): the regional state read is deleted in the same pull request.

**Done when.** A second session plays two years in a drawn place, naming the place and seed, and the state's term read for unemployment, wages and prices equals the tier's kept months for the same state.

**Waits on.** metrics-state-figures-one-owner.

**Files.** src/core2/term-read.ts, src/core2/regional-model.ts, src/core2/modules/macro.ts

Built (Account lead thread, Nov 15). The tier's kept months (`countryStateMonths`, src/core2/modules/macro.ts) now also hold the real coarse months before the opening, on the regional table's retention (the year before the opening in full, each December before), summed to the state by population from the same months the tier is fitted from. Why they needed a shift: the tier opens every state's unemployment scaled by one factor so the states sum to the nation's rate on day one (0.9803 in the world drawn at Everett, seed 7a5e19c2b3d84f60), and its jobs and people are its own fit (pay matches the regions exactly), so the regions' sums and the tier's are two honest fits, not a fault in either. The tier is the truth at the opening; each history figure is multiplied by the tier's opening over the regions' opening, so the history keeps its own movements and meets the tier exactly. `term-read.ts` reads those rows (`stateRowAt`); the regional read of a state is gone, and the regional-model function that sums a state's regions is renamed `stateOfRegions`, so one name reads a state. Proof: `src/core2/term-read-state-tier.test.ts`.
