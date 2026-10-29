---
id: gov-m3-spec-commands
title: "The four governing golden-path specs (M3-01, M3-02, M3-04, M3-05) get a test command"
area: docs
kind: cleanup
priority: 2
size: S
status: claimed
claimed-by: governing/m3-spec-commands
pr:
blocked-on:
source: governing lead, Oct 29 (work order first task)
lead: governing
claimed-at: 2026-10-29T22:45:54.494Z
---

**What.** The governing work order's first task: M3-01 writing a bill, M3-02 negotiating, M3-04 laws change the world and M3-05 the executive have no command in docs/roadmap/features.json, so nobody can check whether they are done. Each gets the command that runs the existing tests covering the most of its test sentence, passes stays false, and every clause no test covers becomes its own pool item with lead governing. The commands are the M4-06 form on the root vitest config, one worker at a time.

**Rules.** Look before you ask: the existing tests are named and cited per clause rather than written again, and the uncovered clauses are filed after searching the pool for twins. One rule, all 56 places: every named test draws its place from all 56 and reads GOLDEN_PATH_SEED so the runner's reported place and seed are the ones that ran.

**Done when.** docs/roadmap/features.json gives M3-01, M3-02, M3-04 and M3-05 a command whose files exist under the root vite config and that tests/golden-path/runner.mjs validates; passes stays false; each uncovered clause has a pool item with lead governing; the six candidate tests that ignored GOLDEN_PATH_SEED read it.

**Files.** docs/roadmap/features.json, src/bench/bill-paper.test.ts, src/core2/office-day-desk.test.ts, src/core2/budget-desk.test.ts

**Notes.** TODO
