---
id: drives-displaced-prove-oneself-over-band
title: "M1-11 is red on main in North Canton, Ohio: 35 percent of displaced workers set out to prove themselves"
area: people
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6044
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The accepted spec M1-11's command (src/bench/m1-11-check.ts) fails on main in North Canton, Ohio (place key 3956294, seed 8a8c23de2f386de8944a7ea780e0004858517370b27b7434222d447aeebaf97c): 35.1 percent of 111 displaced workers choose prove-oneself, outside the 6 to 25 percent band the drives engine's own test holds (data/research/drives/economic-losses.json: retraining 10 to 16 percent plus a few points of new businesses). Steamboat Springs, Colorado reads 14.5 percent and Niceville, Florida 12.5 percent, so the rate moves with the town far more than the research allows. Golden-path turns red by draw on unrelated PRs (lamontaes/Political-Game-Git#5972). Find which inputs to the drives response choice (ambition fit, age agency, traits, the job lost) drive North Canton's displaced workers to prove-oneself, and fix the cause in the engine, not the band.

**Rules.** No dice: each worker's own traits, age, money and the job they lost decide the response; real rates check the total and never pick one person's outcome. One rule, all 56 places: the fix must hold in every drawn place, and the check's band and assertions stay as they are.

**Done when.** GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY above make node --max-old-space-size=8192 --import tsx src/bench/m1-11-check.ts pass in North Canton, with the cause named by file and line in the PR, and it passes in Steamboat Springs, Colorado (0873825) and three more drawn places named with seeds; src/core2/drives-economy.test.ts passes unchanged.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/data/parameters.json

**Notes.** Sent back 2026-10-25 from PR #6044 (branch claude/quirky-ride-vrwwz4-prove-oneself): the unchanged M1-11 check on independent Manson IA seed b63a9c1eccbba0f45589110cb2c6924003d0e8b668b9298a1bde2302f0d6df98 drops prove-oneself from clean main’s 4/25 (16%) to 1/25 (4%), below the unchanged 6–25% band; finish on that branch, merge main into it first.

Merger 0, Oct 26: Sent back from PR #6044 at actual corrective/merged-main head 5927e9dae374: center 40 / width 18 / fit 3.4 fixes the retained Manson rate (2/25=8.0%), but the primary North Canton Done-when is still red on seed 8a8c23de2f386de8944a7ea780e0004858517370b27b7434222d447aeebaf97c, place 3956294: 34/121=28.1% against unchanged 6-25%, full year exits 1 for that rate alone in 184.92 seconds. Static checks and required economy test 5/5 pass (pool 34 exact main); later retained world runs stopped after the primary failure and are not green. Preserve the input and assertions, fix the general model without selecting replacement draws or tuning to these towns, and replace the stale body/table with actual final results; finish on claude/quirky-ride-vrwwz4-prove-oneself, merge main into it first.
