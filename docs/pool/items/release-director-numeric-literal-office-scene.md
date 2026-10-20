---
id: release-director-numeric-literal-office-scene
title: "director.test.ts fails on main: a numeric literal 0 in src/director/office-scene.ts breaks the keeps-numbers-in-data check"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/director.test.ts 'registers every stopgap it marks and keeps numbers in data' fails on clean main with ['office-scene.ts:0']: line 187 compares officialsIn(api, key).length > 0 and the test refuses any numeric literal under src/director. Express the check without a literal (for example Boolean of the length) so the director test is green.

**Rules.** Replace, never layer. No behavior change.

**Done when.** src/director/director.test.ts passes on a branch from current main, including the numbers-in-data check; eslint and prettier are clean on src/director/office-scene.ts.

**Files.** src/director/office-scene.ts

**Notes.** Found Oct 20 while rebuilding words-housing-moved-lines (claude/political-game-pool-yucp92-bp); fails identically on clean main.
