---
id: play-first-12-politics-screen-to-mock-b
title: "Politics → Issues shows law cards, not a list"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-first-12-politics-screen-to-mock-a
source: added with npm run pool -- add
---

**What.** The owner rejected a plain list for Issues ("like an Excel sheet") and approved law cards grouped by subject, like Democracy 4 and Crusader Kings 3. The v0.22.10 Issues tab is four plain rows. This item builds Issues as the mock's law cards from the law in force.

**Rules.** This is a game, not a spreadsheet: Issues is law cards, never a plain list. One rule, all 56 places: each card reads the law in force at its level from the place's records.

**Done when.** In a drawn place, Politics → Issues shows law cards grouped by subject with the law in force, a marker, who can change it and since when, read from the law records, shown by a screenshot beside the mock.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
