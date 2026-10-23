---
id: roadmap-m1-housing-business-renewal-flags
title: "Roadmap M1-05, M1-08, M1-09 pass in a drawn place and their flags flip, with evidence"
area: world
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone: M1
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The roadmap's M1 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M1 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M1-05 "Housing"; M1-08 "Businesses grow and shrink"; M1-09 "Births, moves and new residents". Their tests, which nobody may edit: M1-05: Rents and home prices in a random place fall within real ranges for its region; an eviction happens only from unpaid rent, through the steps that place's law requires. M1-08: A year's business openings and closings stay within real rates (Census Business Dynamics Statistics); owners' income comes from profit; across multi-year runs, some businesses add locations without being scripted to. M1-09: A year's births and moves in a random place stay within that place's real rates; the town's population changes the way real towns do instead of winding down.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M1-05, M1-08, M1-09, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/core2/moves.test.ts, src/core2/modules/housing.ts, src/core2/modules/business.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). M1-05 and M1-08 have no command yet; write them. A PR names this item on line 1 and `Lead: m0-m2` in its body.
