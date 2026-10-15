---
id: world-price-laws-repeal-draw
title: "price-laws.test.ts fails on some random-place draws, also on clean main"
area: world
kind: bug
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found while running tests for core-year-over-120s, Oct 15"
---

**What.** `src/core2/price-laws.test.ts` draws a random place each run. In three runs on one machine it failed once on a branch that changes counted price settlement, passed once on the same branch, and failed once on clean main. The failure is in the repeal step (after `changeLaws(-1)` the price rules should be gone). Record the failing draw (`LAW_LINK_DRAW`), find the cause and fix it at the root.

**Rules.** One rule, all 56 places; tests and watched runs name the place and seed.

**Done when.** The test passes on ten random draws, each named.

**Files.** src/core2/modules/place-prices.ts, src/core2/price-laws.test.ts

**Notes.** The test does not print its draw on failure; print it first.
