---
id: drives-displaced-ambition-floor-small-town
title: "M1-11 red on main in Playita, Puerto Rico: 1 of 17 displaced workers forms an ambition, under the 6% floor"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The accepted spec M1-11 fails on main 90e3abef7 in Playita, Puerto Rico (place key 7263503, seed 8be0e68a6844fe807895aebee61028b0fc511fbe4baf92fc675e9d19d427046b). In src/core2/drives-economy.test.ts, the test 'forms ambitions at the displaced-worker rate, with most people carrying on' saw 0.0588 (1 of 17 displaced workers) against a floor of 0.06. The town is small, so one person moves the share by six points; the band check reads a share of too few people to hold either way.

**Rules.** No dice: the floor must come from the drive's own causes, not a rerun until a seed passes. One rule, all 56 places: a small town must pass by the same rule as a large one, so the check needs a sample size or a spread that a 17-person sample can meet.

**Done when.** drives-economy.test.ts passes in Playita, Puerto Rico (7263503) with the seed above and in a second drawn small place, with the band check reading enough displaced workers or a spread sized to the sample, and the golden-path runner shows M1-11 passed on main.

**Files.** src/core2/drives-economy.test.ts

**Notes.** TODO
