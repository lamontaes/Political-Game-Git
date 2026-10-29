---
id: drives-displaced-prove-oneself-over-band-again
title: "M1-11 is red on main again in Washington, D.C.: 35.1 percent of displaced workers set out to prove themselves"
area: people
kind: bug
priority: 1
size: S
status: done
claimed-by: fixer/red-main-m1-11-prove-oneself
pr: #6718
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T22:20:59.217Z
---

**What.** The golden-path check M1-11 fails on clean main at 7897579380 in Washington, District of Columbia (place 1150000, seed b09f3d98a55b15d4dc5791c10adf3137f641b3c6e7abe324a7cefdfdf7ae2559). 35.1 percent of 231 displaced workers form a prove-oneself drive, outside the researched 2.9 to 30.7 percent band. Two earlier items fixed the same overshoot in North Canton, Ohio (#6044) and Eden, Utah (#5909), so the share still runs high in some places. It turned PR #6421's golden-path check red, which touches only the director.

**Rules.** No dice: the share is people's own decisions from their traits and circumstances, so the fix calibrates what they read, never a cap or a roll. One rule, all 56 places: the check must hold on any drawn place, never by choosing a seed that passes.

**Done when.** src/bench/m1-11-check.ts passes with GOLDEN_PATH_SEED=b09f3d98a55b15d4dc5791c10adf3137f641b3c6e7abe324a7cefdfdf7ae2559 and GOLDEN_PATH_PLACE_KEY=1150000, and on three other drawn places, each named with its seed and the share it found, in a played world from buildBenchWorld.

**Files.** src/core2/modules/drives.ts, src/bench/m1-11-check.ts

**Notes.** TODO Oct 28, 22:10 UTC (laws session): red again on clean main d133f66564 in Fall City, Washington (GOLDEN_PATH_SEED=45f189dc90ac79f989b104e6824c2c5eba0d5664f3e7856b2db9338863337d40, GOLDEN_PATH_PLACE_KEY=5323200): 41.3% of 46 displaced workers set out to prove themselves, outside 0.0-37.8%; it turned golden-path-year red on PR 6702.


Evidence (integrator, Oct 27, 23:55 UTC): red on main at 5e91d81dd1 in Waimanalo, Hawaii: GOLDEN_PATH_SEED=42d24355021f2f81ea874d86a02d00959f83148b52996a86deb64475e1b44e2f GOLDEN_PATH_PLACE_KEY=1578050 (drawn for PR #6397 head 4f608298), "36.4% of 165 displaced workers set out to prove themselves, outside 2.3-31.7%"; identical on clean main and on the PR.
Evidence 2026-10-28 (Merger 1): M1-11 also fails in Dededo, Guam (territory:GU:dededo), seed 6a86a6dce59e3f55fab7eeabe27d76b9a19ff18368eda204d32f48739a1dffa2: 33.0% of 370 displaced workers set out to prove themselves, outside 3.5-29.5%. Reproduce: GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=territory:GU:dededo node --import tsx src/bench/m1-11-check.ts. It failed golden-path on PR #6386 (not that PR's files); `drives-economy.test.ts` passes at the same seed.
Evidence 2026-10-28 01:20 (laws-and-effects lead): M1-11 fails in Glendale, Arizona (0427820), seed 3ec6ef046943621104536b818cb87eda9099f5669a354dab92db3188ebf027f0: 29.6% of 496 displaced workers set out to prove themselves, outside 3.9-28.9%. It turned PR #6457's golden-path red (that PR changes only bill-section citations); drives-economy.test.ts passes at the same seed.

Again at 4fe93cfd9e: Washington, District of Columbia (GOLDEN_PATH_PLACE_KEY=1150000, GOLDEN_PATH_SEED=bd9ccdc0e473e1f85dd9235af03ebe0097aaa0fc2a3694eca52dd440c0e74436), 31.9% of 226 displaced workers set out to prove themselves, outside 2.8-30.8%. Drawn for #6682 (golden-path-year job 123057125419); identical on clean main. Old engine session, Oct 28.

Oct 28 (traits lead): reproduces on clean main 1bc47a861e in Washington, District of Columbia (1150000), seed e3cf7fa8aab01dfe87c0f0b401926f10016022d0c1a7fa15fb68314f42b27e28: 32.5% of 212 displaced workers set out to prove themselves, outside 2.7-30.9%; it turned golden-path-year red on PR #6681 at M1-11 with the same numbers.

Red-main owner, Oct 28 23:10 UTC: red on main 37d1b0bc92 in Woodside East, Delaware (1080895, seed e2b38f391875b77c3600226ccc6bb8eb3896cd3b25046b6ee2bb7d8dec8fc290): 39.1% of 64. Six places drawn from root m1-11-calibration-2026-10-28 at fit 3.4 split by size: Puerto de Luna, New Mexico 12.0% of 25; Armour, South Dakota 11.8% of 17; Murdo, South Dakota 18.7% of 75; Oslo, Minnesota 11.1% of 9; Austin, Minnesota 34.4% of 253; Abington, Massachusetts 37.2% of 293. Not repeat losses (Austin: 249 people for 253 losses) and not a tier (counted 80 of 242, full 7 of 11). The choice is a near tie with carry-on that the loss's pressure and the money need tip. At the calibration commit 1588fd5de0 the same D.C. seed (1150000, e3cf7fa8aab01dfe87c0f0b401926f10016022d0c1a7fa15fb68314f42b27e28) reads 21.1% of 71 displaced workers; at 1bc47a861e, 32.5% of 212. Bisecting 1588fd5de0..5e91d81dd1 for the commit that moved it.

Oct 29 (CTO): set done; PR #6718 merged (the done flip failed while branch protection refused the flip job's push).
