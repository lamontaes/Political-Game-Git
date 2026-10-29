---
id: roadmap-m1-housing-budgets-business-commands
title: "Roadmap M1-05, M1-07 and M1-08 have no command: a played-year check for each"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by:
pr: #5893
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Roadmap M1-05 (housing), M1-07 (budgets and taxes at every level) and M1-08 (businesses grow and shrink) read passes: false with command null on main, so they can never pass. Each needs a check that plays a year of the bench world in the place the golden-path runner draws and tests its spec text, built on the shared played-year helper the M1-03, M1-04 and M1-06 checks use (src/core2/tooling/m1-played-year.ts).

**Rules.** Wire to the world: each check plays buildBenchWorld with every module installed in a place drawn from all 56, never a hand-made world. No dice: real rates check totals only. Never edit a spec's test text; only command is written.

**Done when.** docs/roadmap/features.json has a command for M1-05, M1-07 and M1-08; each runs a played year in the runner's drawn place, prints the place, seed and record ids, and exits nonzero naming the failed clause; each was run once on main with its result in the PR body, and each fails when its clause is broken. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/tooling/m1-05-check.ts, src/core2/tooling/m1-07-check.ts, src/core2/tooling/m1-08-check.ts, docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m1-laws-budgets-flags and roadmap-m1-housing-business-renewal-flags (CTO branch). Build on the m1-economy branch's helper until it merges.

Sent back 2026-10-26 from PR #5893 (branch claude/quirky-ride-vrwwz4-m1-housing): parent #5876 merged and retarget/integration clean, scoped static gate passes, but own M1-07 Agingan MP draw exits0 while perResident is empty/mandatory territory range unchecked, and runner converts0 to passed/discards output; preserve nonpassing incomplete mandatory coverage and test it without excluding territories; finish on that branch, merge main first.
