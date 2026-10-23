---
id: roadmap-m0-bench-flags
title: "Roadmap M0-01, M0-02, M0-03, M0-04, M0-05 pass in a drawn place and their flags flip, with evidence"
area: play
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

**What.** The roadmap's M0 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M0 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M0-01 "The bench opens in a Codespace"; M0-02 "Play anyone"; M0-03 "Time: Day, Week, Calendar, and skip until something needs you"; M0-04 "Click anything, see why"; M0-05 "The golden path and world panel". Their tests, which nobody may edit: M0-01: Three different seeds give three different places in three different states or territories; each builds without error; and every resident on the list exists in the core's records. M0-02: Over 7 days, every act on the chosen person's record is the character's own recorded answer (Day and Week open no choice list, owner Oct 14, 2026), other residents' lives continue, and an answer nobody was asked for is refused and changes no record. M0-03: A skip from a random date stops exactly at the earliest of: a moment at or over the 0.50 interrupt line, a fixed commitment that needs the player (a routine work shift the character attends on its own never stops a skip; owner, Oct 12), or an offer with a deadline; it says which one; nothing was skipped past. M0-04: 20 randomly sampled items on screen each open a 'why' with scores and record ids that exist in the core; none is made up for display. M0-05: For a fresh life, steps 1-2 show reachable, steps 3-11 show the specific missing module, and the world pieces show 'not in the new core yet' until M1 lands.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M0-01, M0-02, M0-03, M0-04, M0-05, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/bench/m0-check.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). A PR names this item on line 1 and `Lead: m0-m2` in its body.
