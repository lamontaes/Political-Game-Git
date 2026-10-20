---
id: core-office-job-ends-before-days-work
title: "An office job ended the day its holder worked, which stopped the game"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/office-job-end-worked-today
pr: #4917
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T13:07:34.724Z
---

**What.** The game stopped with "A job ends before its day's work, from calendar work" when an official's term ended on a day the official had already worked. `reviewOfficeJobs` (`src/core2/modules/office-day.ts`) ended the holder's office job in the module calendar, which assumes it runs before the day's work; a controlled character plays their own day first, so the job had a shift recorded today. The review now leaves such a job open and ends it in the next day's review, before the day's work.

**Rules.** Fix at the root, the way `keep-from-work` in the justice engine defers a job end: the job ends the day after the last shift. Wire to the world: the job's pay and the official's record follow the real end date.

**Done when.** `src/core2/office-job-worked-today.test.ts` draws a place with a full-time office job, ends the term, marks a shift worked today, and checks the job stays open, then ends the next day; it fails on main with the crash's own error. The path check on seed sw7b544abf (Mead Ranch, Arizona) runs to its end (251 s, steps 3 to 9).

**Files.** src/core2/modules/office-day.ts, src/core2/office-job-worked-today.test.ts

**Notes.** Found by the ten-place path-check sweep, Oct 17 (claude).
