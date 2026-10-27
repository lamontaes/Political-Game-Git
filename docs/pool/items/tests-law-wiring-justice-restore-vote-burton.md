---
id: tests-law-wiring-justice-restore-vote-burton
title: "The justice wiring test's restoring-the-vote case finds no restored voters in Burton, Nebraska"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/justice-restore-vote
pr: #6249
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T06:26:38.496Z
---

**What.** On clean main, src/core2/law-wiring-justice.test.ts's restoring-the-vote case fails in Burton, Nebraska (3107310), seed e04a79c7b7a72c7620a1865ddc5932e2d9b2023f, with restored-voter rows: expected 0 to be greater than 0. Found Oct 26 while merging main into PR #6056. Either the place's opening census had no one whose vote a restoration would return, which the eligibility check should catch before play, or the restoration law did not reach people it should have.

**Rules.** Never loosen or skip the assertion; tests draw from all 56 with bounded retries and fail when they run out; no redraw after play.

**Done when.** The case passes on that seed with restored-voter rows named by record id, or its eligibility check passes Burton over before play with a named reason, and a fresh draw passes.

**Files.** src/core2/law-wiring-justice.test.ts

**Notes.** TODO
