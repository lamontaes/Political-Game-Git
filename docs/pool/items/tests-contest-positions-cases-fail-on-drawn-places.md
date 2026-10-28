---
id: tests-contest-positions-cases-fail-on-drawn-places
title: "contest-positions test cases fail in some drawn places (a filing states a question not in its seat's list; a candidate with no campaign event choice)"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/contest-positions-at-filing
pr: #6375
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T16:55:28.402Z
---

**What.** src/core2/contest-positions.test.ts fails on some drawn places: the first case ('a contest lists only the questions...') fails on clean main (Valdez, Alaska, filing:contest:seat:gus2025:122726:mayor:0:2025-10-07 states a housing question not in the seat's positions); the case added by #6322 failed once in ten runs (Derby Line, Vermont, place seed e08c2c9bb7ce72583896ad352e3067e544453de21198950a6af77c755ae71c0a, no campaign event choice for filing:contest:seat:gus2025:135935:council:0:2025-03-04). Both were seen by Merger 7, Oct 27. A filing's platform is fixed the day it is filed, while a seat's positions follow the law in force and the latest budget, which play changes later.

**Rules.** Never skip or quarantine a case. One rule, all 56 places: a case that needs a candidate with an event choice draws again where the place lacks one and names the place and seed, as the case already does for places with no council or no local filing. Find why the first case's filing states a question the contest does not list (a law passed in play that changed what the seat decides?) and fix the cause, not the test.

**Done when.** On three fresh draws and on the two seeds above the file passes, each failure's cause named by record id in the PR body; npx vitest run src/core2/contest-positions.test.ts passes 10 of 10 fresh runs.

**Files.** src/core2/contest-positions.test.ts, src/core2/contest-positions.ts

**Notes.** TODO
