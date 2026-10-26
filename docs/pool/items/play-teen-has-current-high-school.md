---
id: play-teen-has-current-high-school
title: "A 17-year-old's high school is on record and shown in full on Who you are and Jobs and study"
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/play-stop-08-high-school
pr: #6038
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T15:57:39.096Z
---

**What.** The implementation half of play-stop-08-no-high-school-at-seventeen, so it can merge on bench evidence while the play-stop item waits for the owner's steps on the next installed build. The deep past (src/core2/deep-past.ts) cut every school stage at January 1, 2021, so nobody who started high school (or middle school) after that had one, and the national directory's short names ('ANSON EL', 'ANSON H S') were shown as they are.

**Rules.** Estimate, never UNKNOWN: a school-age person's school starts from the town's real schools. One rule, all 56 places. No hand-written player text: the full names come from a table in the deep-past data.

**Done when.** On the bench's play screen, a new life at age 17 in a town drawn from all 56 (place and seed named) lists a high school by its full name first on Who you are and Jobs and study, with before and after screenshots in the PR; src/core2/deep-past.test.ts has a 17-year-old's high school dated after 2021 and before the opening, and fails with the 2021 cut put back.

**Files.** src/core2/deep-past.ts, src/core2/data/deep-past.json, src/bench/words.ts, src/core2/deep-past.test.ts, src/bench/words-schools.test.ts

**Notes.** Split from play-stop-08-no-high-school-at-seventeen on Oct 25 by the speed lead, following Merger 1's send-back of PR 6037 for the same done-when: this item carries the fix in PR 6038; play-stop-08 stays open for the owner's installed-build acceptance.
