---
id: laws-reach-b-roads-parks
title: "The highways line changes commute time and vehicle costs; the parks line changes leisure time and well-being"
area: laws
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr: #5458
blocked-on: engines that do not exist: a road-condition setter read by commute time and vehicle costs (no commute model in core2), and a park service level read by leisure choices
source: added with npm run pool -- add
claimed-at:
---

**What.** SG-GOV-REACH-B-road-condition and -park-use. The highways and parks lines are service levels recorded on drivers, residents and firms. Read the road level in commute time and vehicle cost, and the parks level in leisure choices and well-being, so a budget change shows up in a person's day.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/modules/work.ts, src/core2/life.ts, src/core2/data/stopgaps.json

**Notes.** Checked Oct 19 before building: core2 has no commute-time model (place-prices.ts does carry a "road" rule kind, the share of roads in poor condition, which is the only road read), and neither roads nor parks appear in docs/roadmap/political-process-baseline.md or the golden path. AGENTS.md ("This is a game, not a spreadsheet") makes a new mechanic of this kind a question for the owner, not a feature. OWNER QUESTION: should road condition and park service level change a person's day at all, or stay a budget-line record? Until he rules, leave this item unbuilt. Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
