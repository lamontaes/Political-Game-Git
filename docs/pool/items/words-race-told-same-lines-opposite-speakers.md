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

**Notes.** lead: words. Filed by the elections wire session, Oct 28, while running the petition line's tests. Oct 29, 02:35 UTC (words session): on main, GOLDEN_PATH_SEED=pet-run-1 passes, and of ten fresh seeds rt-1 to rt-10, seven tell a race with the two speakers' lines different (Questa, New Mexico (3560870), world seed 83580b1b89219181e211855f4aa4cfdefbc9e7fd5be4eea99e80e7a972583e7d, record election-result:contest:seat:gus2025:208799:council:2:2025-11-04; Richmond, Vermont (5059200), record election-result:contest:seat:gus2025:176592:board:0:2026-03-03; Fredonia, Wisconsin (5527550), record election-result:contest:seat:gus2025:136509:board:6:2026-04-07). Seeds rt-2, rt-7 and rt-8 fail before any line is said: none of the eight places the test draws had a race told that year. The lines hold; what is left is the test's draw, which needs more places or a place drawn among those with a race that year.
