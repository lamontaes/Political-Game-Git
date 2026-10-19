---
id: laws-reach-b-roads-parks
title: "The highways line changes commute time and vehicle costs; the parks line changes leisure time and well-being"
area: laws
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** SG-GOV-REACH-B-road-condition and -park-use. The highways and parks lines are service levels recorded on drivers, residents and firms. Read the road level in commute time and vehicle cost, and the parks level in leisure choices and well-being, so a budget change shows up in a person's day.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/modules/work.ts, src/core2/life.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
