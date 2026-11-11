---
id: schools-world-teacher-counts-by-place
title: "The generated world gives Washington, D.C.'s public schools fewer teachers than a near-empty Alaska place"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** The teacher minimum's record counts the teachers each generated world gives the town's public schools. In Washington, D.C. (1150000, world seed d5005a7c6bd3a520-0) it holds 79 teachers, 3 named and a counted group of 76, while in Hobart Bay, Alaska (0232550, world seed f5224bf8731ff0e3614347be20f865fb6493a9f3c57783ce36dba2a764376773) the counted teachers number 99 (found in the health-schools family test, Oct 25). Nobody has traced why a city has fewer teachers than a near-empty place. How a place's public school staff is sized against its enrollment is where to look. Seen: the school's teacher count in a place's school and budget numbers, where Washington, D.C. has fewer teachers than a near-empty Alaska place.

**Cause.** Needs cause. Looked at src/core2/public-pay-floor.ts near line 305: it reads the counted-teacher jobs each organization already holds and applies the teacher minimum, and does not size them, so the sizing happens in world generation and has not been found.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session, to find where public school staff is sized and why the two places differ. When it runs out, write what was read in the item and stop.

**Rules.** One rule, all 56 places: the staff size follows each place's enrollment data and one sourced pupil-teacher ratio, never a named place. Estimate, never UNKNOWN: where enrollment is missing, start from the real average with a per-world spread, marked as an estimate. Ask why: name by record where the 79 and the 99 are set.

**Done when.** A second session builds buildBenchWorld worlds for Washington, D.C., Hobart Bay, Alaska and a randomly drawn place named with its seed, and sees each place's public school teachers sized from its enrollment by one pupil-teacher ratio with its spread, the ratio's source cited in the parameter table. The cause of the 79 against the 99 is named by file and line in the PR, and a test fails when a place's school staff ignores its enrollment.

**Waits on.** Nothing.

**Files.** src/core2/public-pay-floor.ts

**Notes.** From the laws lead's health-schools PR review, Oct 25.
