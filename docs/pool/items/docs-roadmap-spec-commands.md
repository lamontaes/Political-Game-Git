---
id: docs-roadmap-spec-commands
title: "Eleven M2 and M3 specs have no test command, so their passes cannot be set"
area: docs
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found by docs-roadmap-m2-m3-passes (Oct 15, 2026)"
claimed-at:
---

**What.** Eleven M2 and M3 specs in docs/roadmap/features.json have `command: null` (M2-03, M2-10, M3-01 to M3-08, M3-10), so their `passes` can never be set. For each, read the spec's `test` text against the candidate test file named in Notes below, and write the `command` in the file's existing form, `node node_modules/vitest/vitest.mjs run --config src/core2/tooling/vitest.config.ts <test file>` (the form M3-09 uses). Where a candidate test covers only part of the spec text, name both files or leave `passes` false and add a pool item for the missing test; M3-02 (negotiating) has no obvious test, so add the item for one. Run each command on a fresh random seed in a drawn place and set `passes` to match the result.

**Rules.** This is a game, not a spreadsheet: a spec passes only because its test shows the player-facing behavior in the spec text, not because a file exists. One rule, all 56 places: every command draws its place from all 56 and names place and seed in the PR body. An effect is a read: a test that only checks a written record, with no other engine reading it, does not set `passes`. Replace, never layer: a command that is wrong is replaced, never kept beside a second one. Never change a spec's `test` text, only `command` and `passes`.

**Done when.** Each of the eleven specs has a `command` that runs a test covering its `test` text, run once on a fresh random seed in a drawn place (named in the PR body, with the seed), and `passes` set to the result; specs whose test does not cover the text stay false with a new pool item each. Because the golden path is checked in the played world, the PR body also names one `buildBenchWorld` one-year run in a drawn place with its seed for the specs that play it, and a script check of features.json (the roadmap's own validator) passes. Each command remains subject to the CTO acceptance required by the original specification.

**Files.** docs/roadmap/features.json

**Notes.** The nine now true are M2-01, M2-02, M2-04, M2-05, M2-06, M2-07, M2-08, M2-09 and M3-09. M2-06 shares the campaigns test with M2-05. The bench-play half of each spec is not shown by a test and is still for a checker.

Oct 20 (pool feeder): spec written; the blocker said the CTO adds the commands; the CTO merges every PR, so the builder writes the commands in the PR and the CTO's merge accepts them (a CTO call, recorded in the pool feeder report). All eleven candidate test files exist on main.

Oct 29 (governing lead): M3-01, M3-02, M3-04 and M3-05 got commands on branch governing/m3-spec-commands, in the root-config form (`npx vitest run <files> --maxWorkers=1 --testTimeout=900000`, as M4-06), because the core2 config does not match the src/bench and src/director files they need; `passes` stays false on all four, since no named test covers each whole sentence. The uncovered clauses are filed as gov-m3-01-city-attorney-warning-on-the-bill, gov-m3-01-fiscal-note-at-drafting, gov-m3-01-phase-in-by-dated-steps, gov-m3-02-amend-and-endorsement-deals, gov-m3-02-deals-in-the-journal, gov-m3-02-two-stakes-in-a-played-world, gov-m3-04-person-card-law-effects, gov-m3-04-funded-work-delayed-or-failed, gov-m3-05-player-signs-one-vetoes-another and gov-m3-05-mayor-appoints-someone-they-know, with a note on laws-end-to-end-proof. M2-03 and M2-10 already have commands on main, so of its eleven this item keeps M3-03, M3-06, M3-07, M3-08 and M3-10 with no command.
