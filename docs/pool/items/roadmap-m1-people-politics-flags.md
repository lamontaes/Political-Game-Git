---
id: roadmap-m1-people-politics-flags
title: "Roadmap M1-10, M1-11, M1-12 pass in a drawn place and their flags flip, with evidence"
area: people
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

**What.** The roadmap's M1 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M1 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M1-10 "Political views"; M1-11 "Drives answer the economy"; M1-12 "Important people everywhere". Their tests, which nobody may edit: M1-10: In a random place, views match real spreads by age, education, faith and region, checked against state and metro answer keys, so conservatives in two randomly drawn states can differ; a big event shifts the people it touches and no one else. M1-11: Over a year, job losses, evictions and closures form drives at a researched rate, and a drive's target is a real person or institution involved in the event. M1-12: Click any official in any state: a full record with personality, history, relationships and the positions behind their votes.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M1-10, M1-11, M1-12, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/core2/views.test.ts, src/core2/drives-economy.test.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). M1-12 has no command yet; write it. A PR names this item on line 1 and `Lead: m0-m2` in its body.
