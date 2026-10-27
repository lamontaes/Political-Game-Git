---
id: core-outside-governments-treasuries
title: "A national-scale federal treasury and a coarse treasury for every other state pay their own officials"
area: core
kind: stopgap
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/outside-governments.ts pays federal officials and other states' officials from an outside party because the town's federal treasury holds only the town's share of federal taxes. Build a federal treasury at national scale and a coarse treasury per other state, funded from the macro engine's national and state totals, so officials are paid from them and estates escheat to them. This is L: split into the federal treasury, then the other states' treasuries.

**Rules.** Every dollar must balance: the new treasuries post through the journal. Wire to the world: officials' pay and escheats read the treasuries.

**Done when.** In a one-year run of the played world (buildBenchWorld, drawn place and seed named), the president's monthly pay posts from the federal treasury record by id at its real amount, another state's governor is paid from that state's treasury, and the journal balance tests pass.

**Files.** src/core2/outside-governments.ts, src/core2/modules/macro.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-CORE-outside-governments. Split into S/M parts before building.
