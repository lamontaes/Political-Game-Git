---
id: words-ledger-numbers-red
title: "Main red: the moment spacing loop in ledger.ts uses bare 0 and 1"
area: words
kind: bug
priority: 1
size: S
status: claimed
claimed-by: lane3/red-ledger-numbers
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T08:24:21.612Z
---

**What.** director.test.ts 'registers every stopgap it marks and keeps numbers in data' fails on main: src/director/ledger.ts (the minDaysApart look-back from #7199) loops with bare 0 and 1.

**Rules.** Every number lives in a parameter table (AGENTS.md, Placeholders).

**Done when.** director.test.ts 'keeps numbers in data' passes; campaign-months.test.ts still passes at Murray.

**Files.** src/director/ledger.ts

**Notes.** Filed by Lane 3 (Nov 4); fix on lane3/red-ledger-numbers.
