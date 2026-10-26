---
id: world-counted-households-zero-income
title: "Counted households in coarse places have no income, so their poverty share reads 100%"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: added by EFFECT-WEB-WIRING
---

**What.** In a bench world for Warm Springs, Arkansas (seed 0659930dc1c80953, `buildBenchWorld`, two-level, 100 days), `householdPoverty` gives every counted household in one coarse place (jurisdiction_8acca737ebc52bd4) an income of 0. All 202 of its people are poor. A second coarse place (jurisdiction_110a270fc5744cc7) has 129 of 145 poor with mostly zero incomes. The town itself (45 full households, 96 people) has none below the line. Real places sit near the national 11%, so either counted households outside the player's town are never given wages, or `householdPoverty` reads a wage field that is never filled for them.

**Rules.** One model, two tiers: a counted household is read with the same rule as a full one; estimate, never zero; no dice.

**Done when.** In a drawn bench world, the poverty share of every place with counted households sits within the researched state range, by record id. A test names the place and seed, and `src/core2/world-poverty.test.ts` still passes.

**Files.** src/core2/world-poverty.ts, src/core2/modules/residents.ts
