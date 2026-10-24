---
id: roadmap-m1-economy-commands
title: "Roadmap M1-03, M1-04 and M1-06 have no command: a played-year check for each"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #5876
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Roadmap M1-03 (state and metro economies), M1-04 (jobs) and M1-06 (credit and banks) read passes: false with command null on main, so they can never pass. Each needs a check that plays a year of the bench world in the place the golden-path runner draws and tests its spec text. M1-02's check (src/core2/tooling/m1-02-check.ts) is the pattern for reading the runner's place and seed and exiting nonzero with the reasons.

**Rules.** Wire to the world: each check plays buildBenchWorld with every module installed in a place drawn from all 56, never a hand-made world. No dice: real rates check totals only. Never edit a spec's test text; only command is written.

**Done when.** docs/roadmap/features.json has a command for M1-03, M1-04 and M1-06; each runs a played year in the runner's drawn place, prints the place, seed and record ids, and exits nonzero naming the failed clause; each was run once on main with its result in the PR body, and each fails when its clause is broken.

**Files.** src/core2/tooling/m1-03-check.ts, src/core2/tooling/m1-04-check.ts, src/core2/tooling/m1-06-check.ts, docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m1-economy-flags (CTO branch). M1-04 is expected to fail its layoff clause until world-customers-move-between-sellers lands.

Sent back 2026-10-23 from PR #5876 (branch claude/quirky-ride-vrwwz4-m1-economy): M1-04 rates count weighted jobs and seekers as one; M1-03 suppresses a state opening-unemployment mismatch when its rest-region rate equals the source; finish on that branch, merge main into it first.
