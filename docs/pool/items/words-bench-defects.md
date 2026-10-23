---
id: words-bench-defects
title: "The chapter that repeats a birth and the family scene staged in a neighbor's household are fixed"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: claude/words-bench-defects
pr: #4594
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:17:33.021Z
---

**What.** Batch 11 held for two engine-side defects in the bench's path. A chapter printed "My daughter was born. My daughter was born." for two children with two dates, and a family scene opened on a roll call of ten relatives and was staged in a neighbor's household. Fix both in `src/director/journal.ts` and `src/director/scene.ts`: a chapter names the child or the date that tells two births apart, and a family scene is staged in the player's own household from that household's records. The player would notice a memoir that says each birth once and a family scene in his own home.

**Rules.** No hand-written player text: the fix changes which record is read and never types a sentence; ask why: each line cites its record id; one rule, all 56 places: no place named in logic; no dice.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 (name it and the seed in the PR body), a household with two children born in the run prints each birth once in the memoir, with a differing child or date, shown by a test in `src/director/journal.test.ts`; and a family scene fired for the player is staged only in the player's own household with a named cast of no more than the people the records put there, shown by a test in `src/director/scene.test.ts`.

**Files.** src/director/journal.ts, src/director/scene.ts, src/director/journal.test.ts, src/director/scene.test.ts

**Notes.** Part of words-grading-bench (Order 2 of docs/archive/2026-10-23/work-orders/words-and-director-2026-10-15.md); absorbed from the closed words-batch-12 item.
