---
id: drives-displaced-prove-oneself-over-band
title: "M1-11 is red on main in North Canton, Ohio: 35 percent of displaced workers set out to prove themselves"
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

**What.** The accepted spec M1-11's command (src/bench/m1-11-check.ts) fails on main in North Canton, Ohio (place key 3956294, seed 8a8c23de2f386de8944a7ea780e0004858517370b27b7434222d447aeebaf97c): 35.1 percent of 111 displaced workers choose prove-oneself, outside the 6 to 25 percent band the drives engine's own test holds (data/research/drives/economic-losses.json: retraining 10 to 16 percent plus a few points of new businesses). Steamboat Springs, Colorado reads 14.5 percent and Niceville, Florida 12.5 percent, so the rate moves with the town far more than the research allows. Golden-path turns red by draw on unrelated PRs (lamontaes/Political-Game-Git#5972). Find which inputs to the drives response choice (ambition fit, age agency, traits, the job lost) drive North Canton's displaced workers to prove-oneself, and fix the cause in the engine, not the band.

**Rules.** No dice: each worker's own traits, age, money and the job they lost decide the response; real rates check the total and never pick one person's outcome. One rule, all 56 places: the fix must hold in every drawn place, and the check's band and assertions stay as they are.

**Done when.** GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY above make node --max-old-space-size=8192 --import tsx src/bench/m1-11-check.ts pass in North Canton, with the cause named by file and line in the PR, and it passes in Steamboat Springs, Colorado (0873825) and three more drawn places named with seeds; src/core2/drives-economy.test.ts passes unchanged.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/data/parameters.json

**Notes.** TODO
