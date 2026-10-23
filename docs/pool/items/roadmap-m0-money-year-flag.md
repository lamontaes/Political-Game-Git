---
id: roadmap-m0-money-year-flag
title: "Roadmap M0-08 pass in a drawn place and their flags flip, with evidence"
area: core
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone: M0
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The roadmap's M0 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M0 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M0-08 "Money that works for a year". Their tests, which nobody may edit: M0-08: A full year in a random place: under 10% of businesses close; sales pay more than half of all wages; every dollar balances; outside money is reported next to real public spending and Social Security per resident; national conditions flat and labeled until M1.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M0-08, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** scripts/core2-year/closures.mjs, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). The customers ruling of Oct 24 (`world-customers-move-between-sellers`, all three causes) changes who loses sales; rerun the closures check after it lands. A PR names this item on line 1 and `Lead: m0-m2` in its body.
