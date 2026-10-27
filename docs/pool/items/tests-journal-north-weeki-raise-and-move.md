---
id: tests-journal-north-weeki-raise-and-move
title: "Journal raise and household-move fixtures fail on the North Weeki Wachee draw"
area: words
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On clean main 7565bdc4d5, journal.test.ts fails on root e9539f3aa58c00a1 in North Weeki Wachee, Florida. The M4-01 fixture raise finds no moment and throws while reading channels; the household-move case finds no We line where it requires one. The same errors reproduce on main-integrated PR #6093, independently of its new family opening, so unrelated journal changes inherit these red checks.

**Rules.** Wire to the world: determine the generated subject and record eligibility before asserting the moment and line, then retain positive producer assertions for an applicable subject. No dice: keep the recorded root and fresh drawn places, without redrawing after a missing output or loosening assertions to admit nothing.

**Done when.** On the recorded root e9539f3aa58c00a1 and two fresh drawn places named with their seeds, journal.test.ts passes in a played world with the raise moment and household-move line traced to subject and source record IDs. A missing applicable producer or wrong subject must fail the relevant test, and the PR must explain why the original generated fixtures failed.

**Files.** src/director/journal.test.ts, src/director/journal.ts

**Notes.** TODO

Merger 1, Oct 25 23:38 UTC: clean-base log merger1-state/6093-2325/base-journal.log reproduces TypeError at main journal.test.ts:244 and missing We line at :560; PR log reproduces the same at :248 and :567. Separate inherited relative-move age-prefix failure is noted on tests-journal-rio-del-mar-move-lines.

Folded into tests-journal-red-on-seed-3d7f-linganore (Oct 25 audit).
