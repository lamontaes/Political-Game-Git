---
id: core-opening-public-coverage-conflict-bayou-blue
title: "The world cannot be built in Bayou Blue, Louisiana: two coverage rows for one government and place disagree"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-coverage
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T13:51:04.461Z
---

**What.** buildBenchWorld for Bayou Blue, Louisiana (place key 2205175, seed e955294c587729831a6cee88a3d0927ecf6a630617722d4bd7ad78cc74505e07) throws 'Conflicting represented public owner coverage: gus2025:166006/jurisdiction_ddca97177033ff5b' at src/core2/opening-customers.ts:1427 on main 014b3577f8, so the town cannot be played at all. The paired speed guard drew it on #5899 and failed on the base run before measuring anything. Two coverage rows for the same government (gus2025:166006) and place carry different represented resident counts.

**Rules.** One rule, all 56 places: every drawn place's opening must build, so a government covering one place twice is resolved from its records (one coverage per government and place), never by skipping the place.

**Done when.** buildBenchWorld builds Bayou Blue, Louisiana with the seed above, the cause is named by line in the PR, and a test builds the opening for every locality in the place records whose governments carry more than one coverage row for a place, naming any that fail.

**Files.** src/core2/opening-customers.ts

**Notes.** TODO
