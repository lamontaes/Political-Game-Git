---
id: people-cause-shared-daily-repeat
title: "One person shares the same cause with the same neighbor every day for a week (Euharlee, Georgia, seed life-2: Nicholas Phillips to the mayor, May 5 to 11, 2025)"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In a one-year played world (seed life-2, Euharlee, Georgia), Nicholas Phillips records a cause.shared event with the mayor, Benjamin Gray, about the same cause on each of seven days running, May 5 to 11, 2025, and Raymond Gray does the same on four days in August. Sharing a cause is a persuasion act that should wear out: someone who already told a neighbor about a cause, and heard their answer, does not tell them again the next morning. The director now stages the same invitation once a month at most, but the repeated records still move views and fill the log.

**Rules.** No dice: whether someone shares a cause again reads their own drive, the tie and the answer they got last time, never a roll or a daily chance.

**Done when.** In a played world built by buildBenchWorld on a seed the builder did not choose, no person records cause.shared with the same person about the same cause twice within a week unless something on record changed in between (a new event on the cause, a changed view), named by record id in a test.

**Files.** `src/core2/modules/views.ts`, the drive or cause-sharing producer that writes `cause.shared`.

**Notes.** Found by the Words session on Oct 20 following a mayor's year for batch 21; the director's thirty-day repeat window (`repeatDays` in `src/director/data/situation-types.json`) keeps the scenes from repeating meanwhile.
