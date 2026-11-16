---
id: tests-race-result-stories-drawn-place-prints-no-race-story
title: "race-result-stories.test fails in its drawn place when the place prints no race story"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: builder M3's gate on the one-paper wording fix, Nov 15; red the same on Train 29ef46856d0b2cd6d74595d587875a1787820115
checked: m3 2026-11-15
---

**What.** `src/bench/race-result-stories.test.ts` is red on its drawn case with seed 84c60bd8997267a9: "Washington, District of Columbia (1150000), seed 84c60bd8997267a9:agree:5: race stories printed: expected 0 to be greater than 0". Seen: the test, run with GOLDEN_PATH_SEED=84c60bd8997267a9, red with and without the one-paper wording fix on 29ef4685.

**Cause.** Found in code: the drawn case of `play` in src/bench/race-result-stories.test.ts (line 49) draws up to six places and breaks at the first with a printed race story, but when the sixth also prints none it falls through to the assertion `races.length > 0` on the last draw (the loop's `for (let n = 1; draw.endsWith(":drawn") && n < 6; n += 1)`), so a seed whose six draws print no race story is red by draw.

**Fix.** Pin the drawn case to named places the way the two pinned ones are, taking the seed out of the clock, and say what each passed over.

**Time box.** 1 hour.

**Rules.** A test is never red by draw (pinned-tests, drawn-place-tests).

**Done when.** In a drawn place and seed the builder did not choose, a second session runs src/bench/race-result-stories.test.ts three times and it is green each time, and the test names its places.

**Waits on.** Nothing.

**Files.** src/bench/race-result-stories.test.ts
