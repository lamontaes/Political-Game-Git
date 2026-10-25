---
id: roadmap-m1-economy-commands
title: "Roadmap M1-03, M1-04 and M1-06 have no command: a played-year check for each"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/quirky-ride-vrwwz4-m1-economy
pr: #5876
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T18:31:26.212Z
---

**What.** Roadmap M1-03 (state and metro economies), M1-04 (jobs) and M1-06 (credit and banks) read passes: false with command null on main, so they can never pass. Each needs a check that plays a year of the bench world in the place the golden-path runner draws and tests its spec text. M1-02's check (src/core2/tooling/m1-02-check.ts) is the pattern for reading the runner's place and seed and exiting nonzero with the reasons.

**Rules.** Wire to the world: each check plays buildBenchWorld with every module installed in a place drawn from all 56, never a hand-made world. No dice: real rates check totals only. Never edit a spec's test text; only command is written.

**Done when.** docs/roadmap/features.json has a command for M1-03, M1-04 and M1-06; each runs a played year in the runner's drawn place, prints the place, seed and record ids, and exits nonzero naming the failed clause; each was run once on main with its result in the PR body, and each fails when its clause is broken.

**Files.** src/core2/tooling/m1-03-check.ts, src/core2/tooling/m1-04-check.ts, src/core2/tooling/m1-06-check.ts, docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m1-economy-flags (CTO branch). M1-04 is expected to fail its layoff clause until world-customers-move-between-sellers lands.

Sent back 2026-10-23 from PR #5876 (branch claude/quirky-ride-vrwwz4-m1-economy): M1-04 rates count weighted jobs and seekers as one; M1-03 suppresses a state opening-unemployment mismatch when its rest-region rate equals the source; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5876 (branch claude/quirky-ride-vrwwz4-m1-economy): m1-04-check.ts counts employed counted seekers as unemployed (the actual function returns 7 instead of 4 for paired full/count cohorts), and historical changes use current countedHeadsOf after the year rather than event-time quantities; fix both actual checker paths and add positive employed-seeker/fill-in regressions; keep roadmap flags false; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5876 (branch claude/quirky-ride-vrwwz4-m1-economy): unemployment now uses one rule, but end-of-day observation still records a same-day represented hire as 1 after a real fill-in before first observation (Niceville seed 118d0e8a347d62a772645a1341bcffcd88ba3e3e064306cc90a3bacbb8590f7a, expected 3); capture the immutable quantity at the change and regress this ordering on that branch, merge main into it first.

Recheck 2026-10-24: #5876 now writes immutable heads on job-change rows and merged at d1990a855c76 with pinned c99b113324. Own static gate and six changed tests passed; independent Grand Canyon Village annual M1-04 run had no missing-count failures and correctly named remaining filed economy gaps. This bounded command item is done; prior returns are historical and economic feature flags remain false.
