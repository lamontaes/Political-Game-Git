---
id: work-span-commitment-malformed-full-adult
title: "A full adult's work commitment fails the work-span check, so their clock cannot move"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Washington, D.C. (place 1150000, place seed 6b94f210b56e1581dc4aa4b9c03a5d03abb0770bbd038359cffa5146ce9db27b, drawn by src/bench/player-day-morning.test.ts with run seed 880bf3165f1533e6d38b226fb94b46a86d9688c09cea9c9a341aa2c6686cbad1 at main's version of that test), selecting the richest adult as the controlled person and pressing Day throws 'Work span commitment quantities/date bounds are malformed.' from SpanRead.validate (src/core2/work-spans-v1.ts, near line 309). One of that person's work commitments has a start before birth, an end before its start, a non-positive period or weekly minutes, a bad hourly pay or no slots. Any full person can become the controlled person (a handoff after death, a dev pick), and then the game cannot move.

**Rules.** One model, two tiers: a filled-in person's records must match what the counted world says. No dice.

**Done when.** The malformed commitment is named by record id and field in that drawn world, its producer is fixed at the cause, and a test over every full adult in two drawn places (one of them that D.C. world) builds a SpanRead for each without throwing, naming place and seed.

**Files.** src/core2/work-spans-v1.ts, src/core2/modules/jobs.ts, src/core2/opening-employment.ts

**Notes.** TODO
