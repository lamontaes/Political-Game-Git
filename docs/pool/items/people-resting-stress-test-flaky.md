---
id: people-resting-stress-test-flaky
title: "resting-stress.test.ts fails in some places on main (no one out of work in Stephan, South Dakota; a gap over its bound in Guy, Arkansas)"
area: people
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found Oct 17 while running the life-core test files for core-counted-drift-delete
---

**What.** `src/core2/resting-stress.test.ts` ("resting stress differs by person and is read for a year") fails in some drawn places on main: in Stephan, South Dakota (seed f62886b4713e1bfd90e5805fd5694724961a0ea7) there is no one out of work to compare, and in Guy, Arkansas (seed 6d8751023b0fea2db3802115ef3f08f2b6da9826) a gap is 0.0328 against a bound of 0.03. Pick the comparison from the people the place has, and bound the gap from the engine's own parameters.

**Rules.** No dice: results come from the records. One rule for all 56 places.

**Done when.** The test passes in ten drawn places in a row, including those two seeds.

**Files.** src/core2/resting-stress.test.ts, src/core2/modules/resting-stress.ts

**Notes.** Seen as a failure in two of two main runs, in a different place each time.
