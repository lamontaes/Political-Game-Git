---
id: elections-counted-ballots-nan-faith
title: "An election with a counted voter who has no recorded faith stops when bookkeeping is on: the counted ballots store NaN"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5830
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Since #5501, holdElection (src/core2/modules/voting.ts) keeps each counted voter's faith and degree distance in the countedBallots row as profile.faithFromAverage ?? NaN. A voter with no recorded faith puts NaN in module data, which the module-data guard refuses ('Module data must be finite, acyclic JSON data') whenever bookkeeping is on: office-day-budget-season.test.ts stopped at holdElection through votingCalendarWork, and with bookkeeping on 3 of 6 drawn places stop (seeds h1 to h6, purpose nan-hunt): Ocean Springs, Mississippi (2853520) on 2025-06-03, San Lorenzo, Puerto Rico (7277027) and Madison Center, Connecticut (0944630) on 2025-11-04. The reader (counted ballot replay) already treats a non-finite entry as no profile.

**Rules.** Replace, never layer: store the absence as null, which JSON holds, and read it back as no profile; no guard is loosened.

**Done when.** holdElection stores null for a missing faith or degree, the replay reads it as no profile (and a missing degree as none), the three places above play past their elections with bookkeeping on, and a pinned regression test on Ocean Springs states it; voting tests pass.

**Files.** src/core2/modules/voting.ts

**Notes.** TODO

Sent back 2026-10-23 from PR #5830 (branch claude/counted-ballots-nan): Pinned h1 regression has no independent nonempty drawn-place case and the body lacks its Done-when evidence table; describe the remaining test-only scope against main; finish on that branch, merge main into it first.
