---
id: tests-counted-births-web-constant-factor
title: "Counted-births web test assumes its factor changes in every drawn place"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On exact main 212b57e4367ed3751945e3785ca9163b9225e31a, src/core2/births-counted-web.test.ts:68 fails with WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36. It draws Elyria, Nebraska, and records fifteen identical 1.030 birth factors, so its distinct-factor count is one where it expects more than one. PR #6072 at f8b7d1ff41951522df88bae7cc2adccdac5daa66 fails identically on the same root and place, making this a baseline failure independent of that renewal speed change.

**Rules.** One rule, all 56 places: preserve the independent original root and check meaningful web effects in eligible drawn towns. No vacuous tests: retain positive record evidence and a real producer or reader break that fails, without substituting a convenient seed or forcing observed values.

**Done when.** Diagnose the constant web factor on the original WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36 played world, fix the underlying cause or the invalid test assumption, and pass the original case plus a fresh drawn-place test with nonempty record ids and an unchanged-checker negative control that detects a real producer or reader break. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/births-counted-web.test.ts, src/core2/births-counted.ts, src/core2/modules/outcome-web.ts

**Notes.** TODO

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/births-web-lagged` is kept; claiming this item takes it over.
