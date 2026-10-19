---
id: gov-outside-revenue-aid
title: "Intergovernmental and federal aid lines are paid by the treasury of the level above, on its schedule"
area: gov
kind: stopgap
priority: 1
size: M
status: done
claimed-by: claude/gov-outside-revenue-aid
pr: #4476
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-15T22:08:08.235Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Finding (Oct 15, the claiming session): this is already built. `DATA.aid.flows` in `treasury-spending.json` pays federal aid to state, county and city, and state aid to county and city, from the payer treasury's spending lines, and `closeTreasuries` leaves those lines out of the plug (the `aided` set). In a drawn place (San Jose, New Mexico, a 40-day probe of the played world) the federal, state and county treasuries each showed their aid lines paid by treasury transfers; the only aid-type line still paid by the plug is the state's `intergovernmental` revenue (about 481 million dollars a year there, 3 percent of state revenue), which comes from all of the state's local governments, not this town's. That remainder needs the payer model for other places, so it moves to `gov-outside-revenue-taxes`. Nothing is left to build here; the CTO drops this item when this PR merges.
