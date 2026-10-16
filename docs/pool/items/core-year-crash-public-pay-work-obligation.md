---
id: core-year-crash-public-pay-work-obligation
title: 'A played year stops: "Public pay does not match its actual owned work obligation" (seed scenes-c)'
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/year-crash-public-pay
pr: #4669
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T09:31:57.962Z
---

**What.** A two-level bench world for `scene-year.ts --seed scenes-c` throws "Public pay does not match its actual owned work obligation." (`src/core2/public-work-pay.ts:177`, from the work module's payroll day) partway through its year. Find which public job's pay stopped matching its work obligation, say why by record id, and fix the engine that changed one without the other. The payroll day should then run.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix.

**Done when.** In the repro place and a second drawn place (names and seeds in the PR body) a one-year run of the played world (buildBenchWorld) finishes with no throw, shown by the final date, and the public pay and work tests pass. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/public-work-pay.ts, src/core2/modules/work.ts

**Notes.** From the Words session's notes (Oct 14).

Checked 2026-10-16 (claude session) on current main: does not reproduce. `node --import tsx scripts/dialogue-batch/scene-year.ts --seed scenes-c` runs its year with no throw, and a two-level bench world in La Plena, Puerto Rico (place 7242197, `drawPlace("rand-job-end-1", "job-end")`) runs 2025-01-20 to 2026-01-20 with no throw. The report predates the move of the game start to January 20, 2025. Closing with those runs; reopen with a seed, place and start date if it returns.
