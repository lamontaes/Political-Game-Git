---
id: tests-counted-births-web-constant-factor
title: "Counted-births web test assumes its factor changes in every drawn place"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
lead: laws-effects
model: opus
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** On exact main 212b57e4367ed3751945e3785ca9163b9225e31a, src/core2/births-counted-web.test.ts:68 fails with WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36. It draws Elyria, Nebraska, and records fifteen identical 1.030 birth factors, so its distinct-factor count is one where it expects more than one. A second draw is red in the same test: WEB_BIRTHS_SEED=6e1164126090860a draws Los Cerrillos, New Mexico, and fails "home prices moved the owners' link: expected undefined to be truthy" in the by-tenure case. Nobody has said whether the web's factor really is constant there or the test's assumption is wrong.

**Cause.** Needs cause. Looked at src/core2/births-counted-web.test.ts (line 68) and src/core2/modules/outcome-web.ts: the item offers fix-the-cause or fix-the-assumption without choosing, and no record shows why every factor reads 1.030 in Elyria, Nebraska. Measured: WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36 and WEB_BIRTHS_SEED=6e1164126090860a.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** One rule, all 56 places: preserve the independent original root and check meaningful web effects in eligible drawn towns. One model, two tiers: the counted births read the web with the same rule as a full person, times their count. No vacuous tests: keep positive record evidence and a real producer or reader break that fails, without substituting a convenient seed or forcing observed values.

**Done when.** A second session runs src/core2/births-counted-web.test.ts with WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36 and WEB_BIRTHS_SEED=6e1164126090860a and sees both pass, then on a fresh drawn place with nonempty record ids. An unchanged-checker negative control detects a real producer or reader break, and the PR names why the factor was constant in Elyria, Nebraska.

**Waits on.** Nothing.

**Files.** src/core2/births-counted-web.test.ts, src/core2/births-counted.ts, src/core2/modules/outcome-web.ts

**Notes.** TODO

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/births-web-lagged` is kept; claiming this item takes it over.

Oct 29 18:45 UTC (laws lead): a second draw red on clean main in the same test, a different assertion. WEB_BIRTHS_SEED=6e1164126090860a draws Los Cerrillos, New Mexico: "home prices moved the owners' link: expected undefined to be truthy" (the by-tenure case). Reproduced on origin/main at 169ee503ca and on the laws branch alike.

**Notes (Fable, Nov 10, rerun and read; cause not found).** Still red on main e7b97b11fd with `WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36 npx vitest run src/core2/births-counted-web.test.ts` (Elyria, Nebraska): fifteen months, every factor 1.030. The second seed was not rerun to its end. Read in the test: it expects the web's birth factor to change from month to month within 450 days and the town's home prices to have moved by then. Both seeds draw very small places (Elyria has about 50 people). The first thing for a finder to print is the web's month rows for the place: the unemployment and home-price values the birth rate reads, month by month. If neither moves in a town that small (no home sold, the same few people at work), the factor is right to stand still and the test's assumption is what fails; if they move and the factor does not, the fault is in the web. Either way name it by the month record's id.
