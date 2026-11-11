---
id: core-long-run-counted-ballots
title: "Every race's counted ballots are kept forever (Montpelier, Vermont: 80 MB in 45 rows at year 4)"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: memory/counted-ballots
pr: #8070
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-09T19:02:18.538Z
---

**What.** The voting engine keeps one countedBallots row per local race, holding every counted voter's turnout, split and reasons as parallel arrays, and never removes one. At Montpelier, Vermont (5046000, world seed mont1, fast-forward), year 4, the table was 80 MB of live heap in 45 rows, measured by removing it. Only the why-lookups countedBallotOf and countedBallotsOf read a row; the race's result, returns and the named voters' ballots are separate rows.

**Rules.** Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): a race's counted ballots leave countedBallotRetentionDays after its election, when the next race's are kept, and its result, returns and named ballots stay. Bookkeeping is a debug switch (Oct 11): tests and proofs keep every row.

**Done when.** In play a race's counted-ballot row past the window is gone when the next race's are kept and a recent race's stays; a test shows both; speed:year --seed mont1 --place 5046000 --years 2 records proof against the same main differs only in core2-voting-v1.countedBallots.

**Files.** src/core2/modules/voting.ts, src/core2/data/parameters.json, src/core2/counted-ballot-retention.test.ts

**Notes.** TODO
