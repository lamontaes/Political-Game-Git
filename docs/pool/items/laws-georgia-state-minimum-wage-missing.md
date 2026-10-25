---
id: laws-georgia-state-minimum-wage-missing
title: "M1-01 is red on main in Berlin, Georgia: the state's minimum wage law has no state-level row"
area: laws
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The accepted spec M1-01 (src/core2/laws.test.ts, 'a random place: every tracked series matches its source at every level') fails on main 663a38fedf in Berlin, Georgia (place key 1307304, seed 9be80e9b9066dcf6371f6eb26b4a61bfd555a52f5e9f6df8816bba27f0242dc4) at laws.test.ts:200: expected the state minimum wage 515 (cents an hour, Georgia's $5.15 statute), received undefined. It fails the same at b3acc9946a and its parent, so it predates that change. Golden-path turned red on #5875 by this draw.

**Rules.** One rule, all 56 places: every state's own minimum wage statute is a state-level law row read the same way in every place, including states whose rate sits below the federal one.

**Done when.** GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY above make npx vitest run src/core2/laws.test.ts pass, with the cause named by line in the PR, and the test passes in three more drawn Georgia places and two other states with a rate below the federal one, named with seeds.

**Files.** src/core2/modules/laws.ts, data/laws/

**Notes.** TODO
