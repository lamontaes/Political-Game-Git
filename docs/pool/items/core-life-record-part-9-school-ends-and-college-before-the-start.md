---
id: core-life-record-part-9-school-ends-and-college-before-the-start
title: "The life record, part 9: a past holds the end of high school and college years"
area: people
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: opus-lr
pr: #8927
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: gap sheet, Nov 12, 2026, rows 4 and 15 (Fable A); Life records builder
checked: opus-lr 2026-11-12
---

**What.** The owner, Nov 8: "None of my history is simulated ... a girlfriend or a car accident or college or whatever." Every adult's past tells the years school started and never when it ended, so nobody graduated and nobody went to college before the game began (gap sheet, Nov 12, row 15, both draws). This part writes the end of high school and the college years from records the world already keeps. Seen: a person's card and the Journal, which tell the end of high school and college with a year.

**Cause.** Found in code: `src/core2/past-school.ts` `schoolRecords` writes only `school.started`, one record when the stage or school changes, for grades below the end of high school. No pass writes the end of school; `school.finished` is written only by the director from the school engine's graduation in play. The schooling level exists as the opening profile's `profile:education` fact (CES levels `no-college`, `some-college`, `college`), which `src/core2/past-work.ts` `entryOf` reads to date the first job, with no record of its own.

**Fix.** In the same school pass, from the profile's level and the one school calendar: a `school.finished` record on the last day of the class's senior year, from the last school the run gave them; for `some-college` and `college`, a `school.college-started` record the fall after and a `school.college-ended` record after the level's usual length (the IPEDS program lengths the work pass already uses). The work pass reads the same day (`schoolingEndsOf`), so a first job never begins before school ended. The life table tells them as `school/finished`, `school/college-started` and `school/college-ended`, and the card names the spots for Story.

**Time box.** 4 hours for one Sonnet session.

**Rules.** No dice: nothing is drawn; the level is the profile's and the days are the calendar's. Story writes every line. One engine: the school pass, no second writer.

**Done when.** A second session, on main in a drawn place it names with its seed, opens five adults' cards: each says when high school ended, and one who went to college says it, each with a year once Story's lines are in; Trace on the sentence opens its record. `src/core2/past-school-end.test.ts` passes in three drawn places and prints the town's counts.

**Waits on.** Lines from Story for the spots the pull request names.

**Files.** src/core2/past-school.ts, src/core2/past-work.ts, src/core2/data/life/remembered.json, src/bench/card.ts
