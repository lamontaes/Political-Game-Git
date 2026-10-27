---
id: tests-played-world-counted-change-nets-zero
title: "M0-13 fails a town whose counted births, deaths and moves net to zero"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/counted-change-nets-zero
pr: #5970
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T19:03:39.807Z
---

**What.** The played-world check (tests/golden-path/played-world.node-test.ts, break 12) passes only when the counted population's net change, end plus people filled in minus start, is not zero. In Red Hook, U.S. Virgin Islands (seed dd2a567a9de59b2aa505dcfcefc990ab11e0f8553f1a0fdefa4dcaf4845d0ed8) the year had 7 counted births, 58 counted moves in and out, and counted deaths, and still failed with 'The counted population stayed at 950'. 902 counted at the end plus 48 filled in is exactly 950, so the events canceled. It turned lamontaes/Political-Game-Git#5967 red, and clean main fails the same seed.

**Rules.** Wire to the world: the check reads the counted engine's own records of births, deaths and moves, not only a net total that can cancel. No dice: nothing about the world changes; only the check's reading.

**Done when.** M0-13 passes on the Red Hook seed above and on two fresh drawn places named in the PR, the check names the counted births and moves it read by count, and it still fails, in a test or a temporary run, when the counted engine records no birth, death or move in the year.

**Files.** tests/golden-path/played-world.node-test.ts

**Notes.** Found Oct 24 while checking lamontaes/Political-Game-Git#5967's golden-path-year failure. Measured with bookkeeping off on main at cb2f1c5aaf: start 950, end 902, filled in 48, counted births 7, counted moves 58.
