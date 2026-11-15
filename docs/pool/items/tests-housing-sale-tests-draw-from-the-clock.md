---
id: tests-housing-sale-tests-draw-from-the-clock
title: "Eleven housing, estate and money tests draw their place or seed from the clock; pin each to a named place and seed"
area: world
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: T54
pr: 9542
after: world-counted-renters-buy
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "found by T54 gating world-counted-renters-buy (#9117), Nov 15; Account lead's ruling 17:28Z: its own item and T54's next pull request, before the first-paycheck work"
---

**What.** Eleven test files that #9117 changes draw their place or seed from the clock or `randomBytes` at run time, so a run can land on a place nobody chose and go red by draw: `housing-island-areas` went red at Christiansted, VI (seed 155ff050…) on Nov 15 for that reason. The files: src/core2/counted-departure-share.test.ts, src/core2/counted-estate-home-sale.test.ts, src/core2/estate-home-sale.test.ts, src/core2/home-sale-outside-lender.test.ts, src/core2/home-sale.test.ts, src/core2/housing-island-areas.test.ts, src/core2/housing-readers.test.ts, src/core2/housing-renters-buy.test.ts, src/core2/laws-death-taxes.test.ts, src/core2/macro-mortgage-history.test.ts, src/core2/realistic-not-real.test.ts. Guards: world-counted-renters-buy and the housing sale items these tests prove.

**Cause.** Found in code: in src/core2/home-sale.test.ts and the ten others, each file's seed is `randomBytes(...)` or a hash of `Date.now()` (with or without an environment override), and several loop over draws until one fits, which the test rules do not allow.

**Fix.** Each test names its place and seed in the file, and any record it reads (an owner, a sale, a renter) by id, chosen once by the builder; the draw loops come out. Where a case is rare, it is staged through the game's own path, never hand-copied. Each file states the premise it pins. No assertion is loosened; a test whose pinned place shows a real fault keeps that fault red and gets its own item.

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Pinned tests: named places, fixed seeds, about a minute, a limit near twice the measured time; a new pin is seen red once.

**Done when.** None of the eleven files reads `randomBytes`, `Date.now` or `Math.random`; each passes at its pinned place and seed with its measured time and limit in the pull request body, and each was seen red once with its pin broken. A second session sees in the running game, at Carmel, Indiana (the counted estate sale's pinned place and seed), the partly bought estate home still for sale with a price, as the pinned test says.

**Waits on.** world-counted-renters-buy (#9117), which these tests' assertions belong to.

**Files.** src/core2/counted-departure-share.test.ts, src/core2/counted-estate-home-sale.test.ts, src/core2/estate-home-sale.test.ts, src/core2/home-sale-outside-lender.test.ts, src/core2/home-sale.test.ts, src/core2/housing-island-areas.test.ts, src/core2/housing-readers.test.ts, src/core2/housing-renters-buy.test.ts, src/core2/laws-death-taxes.test.ts, src/core2/macro-mortgage-history.test.ts, src/core2/realistic-not-real.test.ts

**Notes.** From the lying thread, Nov 15: `src/core2/realistic-not-real.test.ts` fails at Gagani, Northern Mariana Islands (territory:MP:gagani), `REALISTIC_SEED=82a3ae5b7c14185a`, on rows 28 (the town's population) and 37 (the schools people went to); seen on #9534's guards job (head c5f817e5) and the same on f6a552b3 (Train c43bf7e0 plus the lying change): 2 failed, 15 passed. Pinning keeps those two rows red at a place that shows them only if the fault is real, with its own item.
