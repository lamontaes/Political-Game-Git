---
id: elections-counted-ballots-nan-faith
title: "An election with a counted voter who has no recorded faith stops when bookkeeping is on: the counted ballots store NaN"
area: elections
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/counted-ballots-nan
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T23:26:48.912Z
---

**What.** Since #5501, holdElection (src/core2/modules/voting.ts) keeps each counted voter's faith and degree distance in the countedBallots row as profile.faithFromAverage ?? NaN. A voter with no recorded faith puts NaN in module data, which the module-data guard refuses ('Module data must be finite, acyclic JSON data') whenever bookkeeping is on: office-day-budget-season.test.ts fails in Princeton, Arkansas (0557530), seed 4c01486e3c3c5b1d, at holdElection through votingCalendarWork. The reader (counted ballot replay) already treats a non-finite entry as no profile.

**Rules.** Fix at the cause: store the absence as null, which JSON holds, and read it back as no profile; no guard is loosened.

**Done when.** holdElection stores null for a missing faith or degree, the replay reads it as no profile (and a missing degree as none), and office-day-budget-season.test.ts no longer stops at holdElection on the Princeton, Arkansas seed; voting tests pass.

**Files.** src/core2/modules/voting.ts

**Notes.** TODO
