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
standard: 2
model: sonnet
effort: medium
lead: governing
root: none
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** legislature.poison-pill never ran in a played election window (Parkway, Missouri): movesPill (src/core2/modules/legislature.ts, line 4766) is asked only after the guards just before its caller (near line 4750) pass, and which guard holds every time was not measured. Measure each guard's pass rate in a played year and either fix the guard that never passes or record why the decision is rare.

**Cause.** Needs cause. Looked at src/core2/modules/legislature.ts function movesPill (line 4766, caller near line 4750) and the gap row legislature.poison-pill in data/content/trait-decision-gaps.json (line 161); no guard pass rates have been measured.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Wire to the world: measured in one year of buildBenchWorld in a drawn place, seed named. Ask why: the report names the guard by file and line.

**Done when.** A second session, in a played year of buildBenchWorld in a drawn place (seed named), reads how often each guard passed, and finds either legislature.poison-pill running with a record id or its gap row in data/content/trait-decision-gaps.json naming the guard that holds.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, data/content/trait-decision-gaps.json

**Notes.** Found Oct 24 by the traits lead's never-run audit.
