---
id: words-race-told-same-lines-opposite-speakers
title: "A race-told scene can read the same for a friendly and a hostile speaker (Waycross, Georgia, seed pet-run-1)"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/race-told-scene.test.ts checks that opposite speakers tell a race differently. With GOLDEN_PATH_SEED=pet-run-1 on the petition branch (claude/elections-petition-filing), the second draw, Waycross, Georgia (1380956), place seed c383dee379909722186061bea6b917d0affbbc3bd7bd0004337500dcbd2bb7fb, as the new adult, composes the same text for traits at +2 and -2, beginning "Narrator: Joseph Banks just won the C...". The petition only changed which race is told first in that world; two other seeds pass, so the gap is in the scene's lines for that race's facts, not in the petition. The race-told lines likely lack a speaker line where the facts give the speaker no tie to the candidate.

**Rules.** Speeches, scenes and lines differ by the speaker's traits: a race told by a friendly and a hostile speaker never reads the same. No hand-written player text in code: the fix is bank lines or a composition rule in the English engine, with grades.

**Done when.** The race-told test passes with GOLDEN_PATH_SEED=pet-run-1 on main after the petition PR lands, and on ten fresh seeds, each naming the place, seed and the race-told record id, with the two speakers' texts differing.

**Files.** src/director/race-told-scene.test.ts,data/english

**Notes.** lead: words. Filed by the elections wire session, Oct 28, while running the petition line's tests.
