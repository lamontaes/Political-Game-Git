---
id: gov-poison-pill-guards-measured
title: "Find which guard keeps a legislator from ever moving a poison-pill amendment"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** legislature.poison-pill never ran in a played election window (Parkway, Missouri): movesPill (src/core2/modules/legislature.ts:3335) is asked only after the guards at :3283 to :3319 pass, and which guard holds every time was not measured. Measure each guard's pass rate in a played year and either fix the guard that never passes or record why the decision is rare.

**Rules.** Wire to the world: measured in one year of buildBenchWorld in a drawn place, seed named. Ask why: the report names the guard by file and line.

**Done when.** A played year of buildBenchWorld in a drawn place, seed named, shows how often each guard passed, and either legislature.poison-pill runs with a record id or its gap row in data/content/trait-decision-gaps.json names the guard that holds.

**Files.** src/core2/modules/legislature.ts, data/content/trait-decision-gaps.json

**Notes.** Found Oct 24 by the traits lead's never-run audit.
