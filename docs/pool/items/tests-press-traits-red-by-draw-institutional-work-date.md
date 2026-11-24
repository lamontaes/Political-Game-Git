---
id: tests-press-traits-red-by-draw-institutional-work-date
title: "The press traits test fails in its setup with 'Institutional work must be placed on an unprocessed future date' on some draws, and prints no seed"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
source: "Interviews thread gate of #9649, Nov 16, 2026"
root: none
---

**What.** `src/core2/modules/press.traits.test.ts` failed in its `beforeAll` with "Institutional work must be placed on an unprocessed future date." (src/core2/module-calendar.ts, the throw near line 141) in one gate run on #9649's head 12ce90f2, beside seven other test files. It passed alone on that branch and alone on the clean Train a62a2fda. Its place is drawn from a fresh `RUN_SEED` each run (src/core2/trait-test-kit.ts), so the other runs drew other places: this is red by draw, not by load. The failing run printed no seed, because the setup threw before the place was named. Guards: the press traits test answers by the same place every time it is run.

**Cause.** Measured: one gate run on 12ce90f2 (Nov 16), `npx vitest run --dir . --maxWorkers=3 src/core2/modules/press.traits.test.ts` beside seven other files, at a drawn place whose seed was not printed. The setup failed after 600 s at most (the hook's limit), and the two clean runs alone passed. Not yet traced: which engine places institutional work on a date the calendar has already processed while `drawnRaceWorld` builds and plays a drawn town for 60 days.

**Fix.** A test that draws its place at run time cannot sit as a known red: whoever next touches this file pins it to named places and seeds (`pinned-tests`), printed before the setup builds them. Then replay the draw that fails, found by a script outside the test capped at one hour, and fix the engine that schedules work in the past, naming it by file and line.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: the test runs at named places and seeds with no run-time draw, and the engine fix applies to every place.

**Done when.** The test runs at named places and seeds and passes alone and beside other files, and the engine that scheduled past work is fixed and named. A second session plays a drawn place on main for 60 days through an election window with no calendar error, naming the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.traits.test.ts, src/core2/trait-test-kit.ts, src/core2/module-calendar.ts
