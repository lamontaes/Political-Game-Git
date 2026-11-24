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
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** On exact main 212b57e4367ed3751945e3785ca9163b9225e31a, src/core2/births-counted-web.test.ts:68 fails with WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36. It draws Elyria, Nebraska, and records fifteen identical 1.030 birth factors, so its distinct-factor count is one where it expects more than one. A second draw is red in the same test: WEB_BIRTHS_SEED=6e1164126090860a draws Los Cerrillos, New Mexico, and fails "home prices moved the owners' link: expected undefined to be truthy" in the by-tenure case. Nobody has said whether the web's factor really is constant there or the test's assumption is wrong.

**Cause.** Found in code: src/core2/modules/outcome-web.ts `effectOf` (line 518) and `causeAt` (line 470), measured on main 7241db05 with WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36 (Elyria, Nebraska; a working copy of the test printed each month's web row, undone after). The factor is right to stand still; the test's two assumptions are what fail. 1. The only birth link that runs is `unemployment-to-births` (data/research/outcome-web/links.json: size -0.0075 per point, `lagMonths` 9). `effectOf` (src/core2/modules/outcome-web.ts line 518) reads its cause nine months back, and a month before the web opened reads the opening's first value (`causeAt`, line 470). Elyria's unemployment was 0 from the opening to month 13 (web:jurisdiction_f5a437f587fb3d3a:2025-01 through 2026-01; 5.7 percent only at 2026-02), so every month of the 15 read the same lagged 0, and the link gave the same +0.0300 (births.rate 103 against a base of 100) though household income and home prices moved. 2. The by-tenure case asserts the links `home-prices-to-owner-births` and `home-prices-to-renter-births` move, but both have status `cause-not-recorded` in data/research/outcome-web/links.json, so the web does not run them: their effect is 0 every month in Elyria, and `webReach` lists no part for them, which is the second seed's failure ('home prices moved the owners' link: expected undefined to be truthy', Los Cerrillos, New Mexico).

**Fix.** Change the test, src/core2/births-counted-web.test.ts. 1. Keep the per-row check that each count's factor equals its month row's births.rate over its base. Replace 'the factor takes more than one value' with draw-and-wait (the drawn-place-tests skill): draw places until one whose unemployment, read nine months back, moves within the run (up to six draws, each passed-over place logged with why), then require its factor to move with it. 2. Remove the by-tenure assertions on the two home-price links while their status is `cause-not-recorded` (Replace, never layer), and leave a one-line comment naming the links and their status, so the case is restored when the links are wired. Do not change the web or the links here.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: preserve the independent original root and check meaningful web effects in eligible drawn towns. One model, two tiers: the counted births read the web with the same rule as a full person, times their count. No vacuous tests: keep positive record evidence and a real producer or reader break that fails, without substituting a convenient seed or forcing observed values.

**Done when.** A second session runs src/core2/births-counted-web.test.ts with WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36 and WEB_BIRTHS_SEED=6e1164126090860a and on one fresh seed, and sees each pass, naming the place whose lagged unemployment moved, its month record ids, and each place passed over and why.

**Waits on.** Nothing.

**Files.** src/core2/births-counted-web.test.ts, src/core2/modules/outcome-web.ts, data/research/outcome-web/links.json

**Notes.** TODO

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/births-web-lagged` is kept; claiming this item takes it over.

Oct 29 18:45 UTC (laws lead): a second draw red on clean main in the same test, a different assertion. WEB_BIRTHS_SEED=6e1164126090860a draws Los Cerrillos, New Mexico: "home prices moved the owners' link: expected undefined to be truthy" (the by-tenure case). Reproduced on origin/main at 169ee503ca and on the laws branch alike.

**Notes (Fable, Nov 10, rerun and read; cause not found).** Still red on main e7b97b11fd with `WEB_BIRTHS_SEED=6fbaabb605afd9ca38e42f3dc05f8d36 npx vitest run src/core2/births-counted-web.test.ts` (Elyria, Nebraska): fifteen months, every factor 1.030. The second seed was not rerun to its end. Read in the test: it expects the web's birth factor to change from month to month within 450 days and the town's home prices to have moved by then. Both seeds draw very small places (Elyria has about 50 people). The first thing for a finder to print is the web's month rows for the place: the unemployment and home-price values the birth rate reads, month by month. If neither moves in a town that small (no home sold, the same few people at work), the factor is right to stand still and the test's assumption is what fails; if they move and the factor does not, the fault is in the web. Either way name it by the month record's id.

Cause found (Nov 11, 2026, cause finder for Fable B): the month rows printed by the probe show household income (78.5 to 100.9), home prices (18.58 to 19.33) and, late, unemployment (0 to 6.0) moving, while the one wired birth link reads unemployment nine months back and the two home-price links are not wired. Whether the +3 percent at a town with no unemployment is the right baseline is a separate calibration question, not part of this fix.
