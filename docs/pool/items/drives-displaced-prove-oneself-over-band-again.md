---
id: drives-displaced-prove-oneself-over-band-again
title: "M1-11 is red on main again in Washington, D.C.: 35.1 percent of displaced workers set out to prove themselves"
area: people
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The golden-path check M1-11 fails on clean main at 7897579380 in Washington, District of Columbia (place 1150000, seed b09f3d98a55b15d4dc5791c10adf3137f641b3c6e7abe324a7cefdfdf7ae2559). 35.1 percent of 231 displaced workers form a prove-oneself drive, outside the researched 2.9 to 30.7 percent band. Two earlier items fixed the same overshoot in North Canton, Ohio (#6044) and Eden, Utah (#5909), so the share still runs high in some places. It turned PR #6421's golden-path check red, which touches only the director.

**Rules.** No dice: the share is people's own decisions from their traits and circumstances, so the fix calibrates what they read, never a cap or a roll. One rule, all 56 places: the check must hold on any drawn place, never by choosing a seed that passes.

**Done when.** src/bench/m1-11-check.ts passes with GOLDEN_PATH_SEED=b09f3d98a55b15d4dc5791c10adf3137f641b3c6e7abe324a7cefdfdf7ae2559 and GOLDEN_PATH_PLACE_KEY=1150000, and on three other drawn places, each named with its seed and the share it found, in a played world from buildBenchWorld.

**Files.** src/core2/modules/drives.ts, src/bench/m1-11-check.ts

**Notes.** TODO


Evidence (integrator, Oct 27, 23:55 UTC): red on main at 5e91d81dd1 in Waimanalo, Hawaii: GOLDEN_PATH_SEED=42d24355021f2f81ea874d86a02d00959f83148b52996a86deb64475e1b44e2f GOLDEN_PATH_PLACE_KEY=1578050 (drawn for PR #6397 head 4f608298), "36.4% of 165 displaced workers set out to prove themselves, outside 2.3-31.7%"; identical on clean main and on the PR.
Evidence 2026-10-28 (Merger 1): M1-11 also fails in Dededo, Guam (territory:GU:dededo), seed 6a86a6dce59e3f55fab7eeabe27d76b9a19ff18368eda204d32f48739a1dffa2: 33.0% of 370 displaced workers set out to prove themselves, outside 3.5-29.5%. Reproduce: GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=territory:GU:dededo node --import tsx src/bench/m1-11-check.ts. It failed golden-path on PR #6386 (not that PR's files); `drives-economy.test.ts` passes at the same seed.
Evidence 2026-10-28 01:20 (laws-and-effects lead): M1-11 fails in Glendale, Arizona (0427820), seed 3ec6ef046943621104536b818cb87eda9099f5669a354dab92db3188ebf027f0: 29.6% of 496 displaced workers set out to prove themselves, outside 3.9-28.9%. It turned PR #6457's golden-path red (that PR changes only bill-section citations); drives-economy.test.ts passes at the same seed.
