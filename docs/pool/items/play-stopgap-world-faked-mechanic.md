---
id: play-stopgap-world-faked-mechanic
title: "Stopgaps in world (faked-mechanic): 1 open"
area: play
kind: stopgap
priority: 2
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/world.ts, kind faked-mechanic"
---

**What.** A `/play` town whose opening has a kin move dated after the opening day opens without the core's opening economy (retirement income, customers) and outside market, on the finance-only route (SG-PLAY-opening-economy-fallback, `src/bench/world.ts` line 179). The cause is that the people engine can date an opening kin move after the opening day (for example `person_beefa2d440edc3cd:move:2026-10-31`), which the core's retirement-income step refuses. Date opening moves on or before the opening day so every town takes the closures route, then delete the fallback. The player would notice every town opening with its full economy.

**Rules.** Replace, never layer: the finance-only fallback in `world.ts` is deleted in the same change and the PR body counts what was removed; No dice: a move's date follows its recorded cause and the opening day, not a roll; Placeholders: the row closes only because the fallback is gone; One rule, all 56 places: the fix is in the date logic, with no place named; An effect is a read, not a record: the retirement-income step reads the moves as valid; Wire to the world: every opened town has its economy in a generated world; One model, two tiers: counted and full households' moves follow the same dating.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the drawn place opens on the closures route with retirement income and customers, kin moves are dated on or before the opening day for seed k-a (the repro), `world.ts` holds no fallback, and the row closes. Tests in `src/bench/world.test.ts` and `src/core2/population.test.ts`. The owner plays it: starts a new life in any town and finds its economy running.

**Files.** src/bench/world.ts, src/core2/population.ts, src/core2/opening-income.ts, src/core2/data/stopgaps.json

**Notes.** First row: A /play town whose opening has a kin move dated after the opening day opens without the core’s opening economy (retirement income, customers) and outside market, on the finance-only route.

Checked 2026-10-16 against main and dropped as already done: its only stopgap SG-PLAY-opening-economy-fallback is resolved in stopgaps.json: opening kin moves are dated on or before the opening day, so every town takes the closures route and the fallback in `src/bench/world.ts` is gone. Nothing is left to build; no PR of this item's own did the work.
