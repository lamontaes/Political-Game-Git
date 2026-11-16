---
id: residents-payday-shortfall-test-retries
title: "The payday-shortfall test in residents.test tries up to six drawn places on a fixed seed, has a one-hour limit, and takes 59 to 370 seconds for the same work"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's test times for #9657, Nov 16 05:00Z; Account lead's ruling 05:06Z (a retry loop hiding something: the item asks for the cause and one attempt)"
---

**What.** `src/core2/residents.test.ts` > "draws the shortfall on the payday, pays the workers in full and records no shortfall" (base seed c6f352a9555a2310ab0c23eaf3c7b037) took 370 s and 180 s alone and 59 s beside five other test files, on the same code (#9657, be1b38c0), against a limit of 3,600 s. Its seed is fixed, so the work should be the same each run. Seen: vitest's verbose times.

**Cause.** Needs cause. Found so far: the test loops over up to six places drawn from `${seed}:${attempt}`, builds each, zeroes the cash of every firm that pays counted wages, runs a year day by day, and takes the first payday a credit line covered in full. How many attempts each run takes, and why the time differs threefold for one seed, is not known: a run that prints its attempts will say whether the place found changes between runs (something not fixed by the seed) or the same attempts run at different speeds.

**Fix.** None until the cause is found. Then pin the one place and seed the test needs in the file (skill pinned-tests), run it once, and set its limit near twice the slower of alone and beside.

**Time box.** 2 hours, Opus, medium.

**Rules.** Pinned tests: named places and seeds in the file, no run-time picking, a limit from measured times; a re-pin states the old premise and needs the lead's yes.

**Done when.** The test names its one place and seed, runs one attempt, and its time alone and beside is within a quarter of each other over two runs, with the limit near twice the slower; the cause of the 59 to 370 s spread is named by file and line. A second session sees in dev mode, at a drawn place it names with its seed, a counted payroll short of cash draw its employer's credit line on payday.

**Waits on.** Nothing.

**Files.** src/core2/residents.test.ts.
