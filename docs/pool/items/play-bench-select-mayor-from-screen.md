---
id: play-bench-select-mayor-from-screen
title: "The bench offers no click that makes the town's mayor the played character"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Politics, Government's key-people list holds the president, legislators and council members, each with a Play button, but no row for the town's mayor or county executive. A player who wants to govern as mayor cannot pick the mayor on screen; the PR #5533 browser run had to post the Play route by hand. The key-people list should carry the town's executive with the same Play control as every other office holder.

**Rules.** No hand-written player text: the row shows record data and control names. One rule, all 56 places: the executive is read from the town's seats, whatever the office is called.

**Done when.** In a bench world drawn from all 56 (place and seed named), a browser run (Playwright, real clicks) opens Politics, Government, clicks Play on the mayor's row and the screen shows the mayor as the played character, with a screenshot in the PR and a test in src/bench.

**Files.** src/bench/office.ts, src/bench/play.ts, src/bench/data/controls.json

**Notes.** Found by the browser run on PR #5533 (Scarsdale, New York; Thompsonville, Michigan 2679600).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: the Advanced play-as picker is the route (OD:82); do not add Play buttons to Government.
