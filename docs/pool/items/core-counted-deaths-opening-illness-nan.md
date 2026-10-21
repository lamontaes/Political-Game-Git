---
id: core-counted-deaths-opening-illness-nan
title: "No counted person dies for the first months: the opening's illnesses under way were never booked (a baby born since made the past-month death chance NaN)"
area: people
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/counted-deaths-opening-illness
pr: #4886
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T17:54:53.736Z
---

**What.** In a new town nobody among the wider population died for the first two months, and few died before the ninth. The serious illnesses already under way at the opening were never booked, and a baby born in the months the code walks back over made the sum of past death chances not a number. The fix, in pull request 4886, leaves out anyone not yet born in a past month and books those illnesses, so deaths and estates begin in the first months. Counted deaths in the first played year ran at 0.73 of the tables in West Hammond, New Mexico and 0.55 in Milford, Connecticut before, and 0.82 and 0.81 after.

**Rules.** Sliding scales and causes: a counted death follows from an illness record and the person's health, never from a monthly chance. One model, two tiers: a counted person's illnesses and deaths read by the same rule as a full person's, times their count.

**Done when.** In the played world (`buildBenchWorld`, a drawn place and a seed the builder did not choose) the first four months show at least half the deaths the tables expect, with the illnesses under way booked at the opening by record id; the test `src/core2/counted-deaths-opening.test.ts` states this and fails on main.

**Files.** src/core2/births-counted.ts, src/core2/counted-deaths-opening.test.ts

**Notes.** Body repaired Oct 17 (claude) from the pull request's description; the fix is in that pull request.
