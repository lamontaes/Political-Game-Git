---
id: roadmap-m1-laws-budgets-flags
title: "Roadmap M1-01, M1-07 pass in a drawn place and their flags flip, with evidence"
area: gov
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

**What.** The roadmap's M1 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M1 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M1-01 "Laws in force, every level"; M1-07 "Budgets and taxes, every level". Their tests, which nobody may edit: M1-01: For a random place, tracked laws (minimum wage; income, sales and property taxes; major benefit amounts) match that place's real starting law at every level; a higher level's override wins where it legally does; a law that hasn't taken effect yet doesn't apply. M1-07: In a random place over a year, every level adopts a budget on its real calendar; federal and state money reaches named residents and the town; every dollar balances; spending and taxes per resident fall within real ranges.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M1-01, M1-07, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/core2/laws.test.ts, src/core2/budgets-treasury.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). M1-07 has no command yet; the builder writes it (acting CTO ruling, Oct 20 night, `docs-roadmap-spec-commands`). A PR names this item on line 1 and `Lead: m0-m2` in its body.
