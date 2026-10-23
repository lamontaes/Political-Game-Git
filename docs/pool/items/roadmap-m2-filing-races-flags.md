---
id: roadmap-m2-filing-races-flags
title: "Roadmap M2-03, M2-10 pass in a drawn place and their flags flip, with evidence"
area: elections
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone: M2
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The roadmap's M2 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M2 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M2-03 "Filing in person"; M2-10 "State and federal races in the world". Their tests, which nobody may edit: M2-03: In a random place, the player goes to that place's real filing office, talks to the person there through dialogue choices, picks an office in the filing overlay, states a platform, gathers any required signatures from real people, files once and is on the ballot; an ineligible player is told the rule in words. M2-10: In a full election year, state legislative, governor, congressional and presidential races run on the same election engine with fictional candidates, and their winners take office on the real dates.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M2-03, M2-10, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/core2/modules/filing-clerk.ts, src/core2/modules/elections.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). Neither has a command yet; write them. Open items that feed these: `elections-counted-ballots-nan-faith`, `gov-played-world-counted-voters-red`, `elections-local-races-too-uncontested`, `elections-polling-place-misses-town-government`, `research-elections-filing-rules-statutes`. A PR names this item on line 1 and `Lead: m0-m2` in its body.
