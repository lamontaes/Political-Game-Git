---
id: core-counted-illness-test-red-courtenay
title: "counted-illness.test fails on main in Courtenay, North Dakota (seed 0b5c642b9b1ced1a9e74ea1914f63d8eb4e9dc9b): a count that should be above zero is 0"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On Oct 20, 2026 the test 'counted deaths follow an illness, and a filled-in ill person keeps it' failed with 'expected 0 to be greater than 0' in Courtenay, North Dakota, seed 0b5c642b9b1ced1a9e74ea1914f63d8eb4e9dc9b, and fails identically on main without any change of mine (GOLDEN_PATH_SEED replays it). Something the test counts, such as counted deaths from illness or a filled-in ill person, is zero in this town. Find which assertion fails, read why that town has none, and fix the engine or the test's draw.

**Rules.** No dice: a counted death follows from a recorded illness, and the check must not depend on a lucky draw. One model, two tiers: a counted group follows the same illness rule as a full person, times its count. One rule, all 56 places: the check draws its place and names it with the seed.

**Done when.** In the played world (buildBenchWorld), GOLDEN_PATH_SEED=0b5c642b9b1ced1a9e74ea1914f63d8eb4e9dc9b passes src/core2/counted-illness.test.ts, the test fails loudly rather than silently when a drawn town has nothing to count, and three fresh random draws pass.

**Files.** src/core2/counted-illness.test.ts, src/core2/modules/health.ts

**Notes.** TODO

**Result (Oct 20).** The town had 57 counted people and one illness in a year, so no death was a true outcome, not an engine defect. The test now runs up to ten years until a counted death occurs and names the counted population if none does. Passes on the seed.
