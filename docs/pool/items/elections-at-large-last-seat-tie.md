---
id: elections-at-large-last-seat-tie
title: "A tie straddling the last seat of an at-large race leaves the seat undecided; the place's tie law never runs"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** atLargeWinner (src/core2/modules/voting.ts) seats the top finishers and, when a tie straddles the last seat, leaves that seat with no winner and says the place's tie law is a later step. Single-seat ties go to breakElectionTie (a second election by the state's rule). Seen at an at-large race in place 1080830 (golden path M2-07, seed 2b3549288dd7f1aefe38d7faeabd385982633b4fa6aa0edfa80e5cd2040f6035): three names, 11, 11 and 15, two seats, one seat with no winner and no second election.

**Rules.** One engine per mechanic, and no dice: run the same tie law the single-seat count runs (breakElectionTie, a second election among the tied for the straddled seat, from place data), through the one count; no second tie engine, and a lot is a law in force, not a roll.

**Done when.** At a drawn at-large race with a tie straddling the last seat (names and seed printed), the tied candidates get a second election, one of them takes the seat on its date, and the seat has a holder; the M2-07 test accepts no seat without a winner except one with a kept tie record.

**Files.** src/core2/modules/voting.ts, src/core2/voting.test.ts

**Notes.** Elections, Nov 9: found while fixing M2-07 (PR #8000); item 2 of the elections goal (every seat has a holder).
