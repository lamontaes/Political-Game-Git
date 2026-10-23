---
id: roadmap-m0-core-pieces-flags
title: "Roadmap M0-09, M0-12 pass in a drawn place and their flags flip, with evidence"
area: core
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

**What.** The roadmap's M0 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M0 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M0-09 "The four core pieces"; M0-12 "Feature list and progress file". Their tests, which nobody may edit: M0-09: Module state, accounts with one balanced writer, the institution calendar and voter groups each have their own contract tests; the speed budget holds; the first two M1 ports build on them without patching the core. M0-12: A fresh session can read docs/roadmap/features.json and docs/roadmap/PROGRESS.md, pick the top unfinished feature and start without asking anyone what's next.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M0-09, M0-12, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/core2/module-state.test.ts, src/core2/accounts.test.ts, src/core2/module-calendar.test.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). M0-09's command names `src/core2/voter-groups.test.ts`, which is not on main (Oct 24): find where voter groups' contract test lives or write it. M0-12's test names `docs/roadmap/PROGRESS.md`, which the doc-freshness work archives; the pool's INDEX is the progress file since the owner's Oct 15 ruling. Flip M0-12 only if a fresh session picks the top item from `features.json` and `docs/pool/INDEX.md` without asking, and say so; never edit a spec's test text. A PR names this item on line 1 and `Lead: m0-m2` in its body.
