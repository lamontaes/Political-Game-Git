---
id: world-housing-calibration-pinned-count-over-its-pin-on-the-train
title: "The housing calibration test fails on the train at its pinned Puerto Rico world: 23 people without a home against a pin of 17"
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
lead: laws-effects
model: opus
effort: medium
root: none
source: Fable B, Nov 15, 2026, while checking release-red-housing-calibration on the train
---

**What.** `src/core2/housing-calibration.test.ts` passes 2 of 2 on main at fa34439db8 and fails on the train at 32a994212b. Its drawn town passes. Its pinned world (place 7237336 in Puerto Rico, world seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8) counts 23 people without a home after a year, against the 17 the test pins it to (`pinnedHomeless`, stopgap SG-WORLD-pr-counted-renter-income-third): "expected 23 to be less than or equal to 17". The test is in nobody's changed-file list, so no gate has run it. Seen: Metrics, "People without a home", in that town after a year.

**Cause.** Measured: place 7237336, world seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8, `npx vitest run src/core2/housing-calibration.test.ts -t 7237336` at each step of a bisect over the train's own folds from main to 32a994212b. The count is within the pin up to the fold before #9353 (2256cf7d82). It is 19 at the fold of #9353 (6832f7c531, "Counted deaths: a record under one person no longer stalls the month; the opening carries each cohort's fraction"), 26 at the fold of #9380 (5c4815f3e6) and 23 at 32a994212b. #9353 makes counted illnesses begin every month in records that stand for under one person, where before the month's illnesses stopped. Not traced: by which records an illness that now begins ends in a lost home in this town, and which later folds moved the count from 19 to 26 and back to 23.

**Fix.** Trace first, then either the pin or the engine.

1. At the pinned world on the train, list the households without a home at the year's end with the record that put each there (`housing` module, `statuses` and `cases`), and mark the ones that follow an illness begun in a month that had none before #9353.
2. If each lost home follows the records the game means it to (an illness, lost pay or a bill, arrears, a court case), the pin is measured again and written with its cause beside it. That is a baseline raised, so it needs the lead's word in the pull request (skill pinned-tests, rule 5).
3. If homes are lost for a reason the records do not carry, that is the fault, and it is fixed in the engine that wrote the status, never in the test.

**Time box.** 2 hours.

**Rules.** Never raise a baseline to get green without the lead's word. An effect is a read: each lost home names the record that caused it. One rule, all 56 places: nothing is special-cased for this town.

**Done when.** A second session runs `npx vitest run src/core2/housing-calibration.test.ts` on the train and sees 2 of 2 pass, and in the running game at that place and seed opens Metrics after a year and reads the same count the test pins, with the pull request naming, by record id, three of the households and what cost each its home.

**Waits on.** Nothing.

**Files.** src/core2/housing-calibration.test.ts, src/core2/births-counted.ts (`applyCountedFlows`, read only), src/core2/modules/housing.ts

**Notes.** The bisect's nine runs, in the order it made them: 214e6a6eb8 and 64928a0ef8 pass; 5c4815f3e6 fails at 26; dc03b7c3ca and 07919bd25b pass; 4472653f32 fails at 19; b778e3a519 passes; 6832f7c531 fails at 19; 2256cf7d82, the fold just before it, passes. The bisect followed the train's first parents only. Not run: the test at the train's newer heads after 32a994212b.
