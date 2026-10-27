---
id: schools-world-teacher-counts-by-place
title: "The generated world gives Washington, D.C.'s public schools fewer teachers than a near-empty Alaska place"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The teacher minimum's record counts the teachers each generated world gives the town's public schools. In Washington, D.C. (1150000, world seed d5005a7c6bd3a520-0) it holds 79 teachers, 3 named and a counted group of 76, while in Hobart Bay, Alaska (0232550, world seed f5224bf8731ff0e3614347be20f865fb6493a9f3c57783ce36dba2a764376773) the counted teachers number 99 (found in the health-schools family test, Oct 25). Not traced why; the counts come from the public schools organization's counted jobs (`src/core2/public-pay-floor.ts:305`). Check how a place's public school staff is sized against its enrollment and fix the sizing if a city's count is too small.

**Rules.** One rule, all 56 places: the staff size follows each place's enrollment data and one sourced pupil-teacher ratio, never a named place. Estimate, never UNKNOWN: where enrollment is missing, start from the real average with a per-world spread, marked as an estimate.

**Done when.** A test builds `buildBenchWorld` worlds for Washington, D.C., Hobart Bay, Alaska and a randomly drawn place named with its seed, and shows each place's public school teachers within the sourced ratio's spread of its enrollment, with the ratio's source cited in the parameter table.

**Files.** src/core2/public-pay-floor.ts

**Notes.** From the laws lead's health-schools PR review, Oct 25.
