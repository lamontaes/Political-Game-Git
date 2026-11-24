---
id: core-recall-override-records-test-flaky
title: "The recall and override records test fails when its six drawn places have no recall or override in a year (seed 9b03cff872b3e5ef, red on main)"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/recall-records-test-draws
pr: #4826
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T21:08:19.512Z
---

**What.** `src/core2/recall-override-records.test.ts` plays six drawn places for a year each and requires at least one recall result or override vote across them. With seed 9b03cff872b3e5ef (Claymont, Delaware; Casco, Maine; Falling Waters, West Virginia; Little Orleans, Maryland; Dumont, Minnesota; Marengo, Illinois) none had either, so it fails on main as well as on a branch that changes nothing it reads. Make the test find an event on purpose: keep drawing until one place has a recall result and one has an override, up to a bound that names every place tried, or build the case in a drawn place through the existing producers (a petition, a veto) and check the same records.

**Rules.** No dice: do not weaken the check or force an event with a roll; a hand-built case goes through the real producers. One rule, all 56 places: the places come from the draw and are named on a failure.

**Done when.** The test passes on seed 9b03cff872b3e5ef and on three other seeds, and a failure names every place tried and its event counts.

**Files.** src/core2/recall-override-records.test.ts

**Notes.** Found Oct 16 while taking director-recall-override-scenes (PR in its item file); the same seed fails on main.
