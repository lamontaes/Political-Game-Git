---
id: credit-closure-test-red-by-draw-duplicate-calendar-key
title: "closure-credit-line.test.ts fails on drawn seeds: a special-election decision schedules a calendar key twice"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: none
source: found by the Account lead's gate on the opening-lines branch, Nov 15
claimed-at:
---

**What.** `src/core2/closure-credit-line.test.ts` draws a random seed and place on every run and throws "Duplicate institutional calendar key." from `keepRace` in the voting module during its year, so a business's closing is never reached. The test passes on other seeds. Seen: it failed on two different drawn seeds in one hour, one with and one without the opening-lines change.

**Cause.** Needs cause. Measured: the test is unpinned (`randomBytes(16)` seed, no place named, line 11), against the pinned-tests rule. It failed at seed eea8c21d565b84a481fc6c4c2ef39533 on a branch with a change to the credit review, and at seed 5d397557254679c6152fb5b9486f9959 on the Train's own credit.ts at head 29ef4685, so the credit change is not the cause. The stack is `module-calendar.ts:151` from `keepRace` (voting.ts:7113), `decide`, `decideSpecial`, `raceWork`: a special-election decision schedules a calendar key that is already scheduled.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Pinned tests: named places and fixed seeds, never loosened. No dice: a special election's schedule comes from the vacancy and the law, never a roll. One rule for all 56 places.

**Done when.** A second session (not the builder) runs the test at the two seeds named above and at the pinned place and seed the fix names, buildBenchWorld in a played world, sees each pass, and the PR body names the file and line that scheduled the key twice.

**Waits on.** Nothing.

**Files.** src/core2/closure-credit-line.test.ts, src/core2/modules/voting.ts

**Notes.** Raised with the lead; the special-elections thread owns `decideSpecial`.
