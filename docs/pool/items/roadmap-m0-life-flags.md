---
id: roadmap-m0-life-flags
title: "Roadmap M0-06, M0-07 pass in a drawn place and their flags flip, with evidence"
area: people
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone: M0
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The roadmap's M0 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M0 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M0-06 "Step 1: a life at 18"; M0-07 "Step 2: meeting people". Their tests, which nobody may edit: M0-06: In a random place, the 18-year-old's parents and siblings follow the kin rules; schools are real schools from the place data (real naming patterns where none exists); every fact shown has a record behind it. M0-07: Over 91 days in a random place: the player gains new acquaintances through real encounters, at least one grows closer, and visits to parents and siblings fall inside the survey ranges (GSS, ATUS); over years, circle turnover matches a sourced study.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M0-06, M0-07, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/core2/m0-life-at-18.test.ts, src/core2/m0-meeting-people.test.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). A PR names this item on line 1 and `Lead: m0-m2` in its body.
