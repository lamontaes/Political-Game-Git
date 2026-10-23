---
id: roadmap-m1-places-history-flags
title: "Roadmap M1-13, M1-14 pass in a drawn place and their flags flip, with evidence"
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

**What.** The roadmap's M1 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M1 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M1-13 "Other places, coarser"; M1-14 "History before your start". Their tests, which nobody may edit: M1-13: In a year, other places' populations and voters' views change from their own conditions within real ranges, and their public events are recorded with place and date so news (M2-09) can carry them. (Narrowed by the owner, Oct 10: other councils legislating is M3-10; news delivery is M2-09.) M1-14: A new game in a random place opens on its start date; people have recent life events dated in the years before it; the economy's recent path matches real figures; laws in force show their dated changes before the start; governments show prior years' budgets; the load time and size are measured. (Owner, Oct 10: officials' election records and recent laws with their effects are added with M2 and M3.)

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M1-13, M1-14, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/core2/modules/world-legislating.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). Neither has a command yet; write them. `gov-prestart-history` (open) is part of M1-14. A PR names this item on line 1 and `Lead: m0-m2` in its body.
