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
