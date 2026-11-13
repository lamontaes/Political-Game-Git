---
id: words-race-told-same-lines-opposite-speakers
title: "A race-told scene can read the same for a friendly and a hostile speaker (Waycross, Georgia, seed pet-run-1)"
area: words
kind: bug
priority: 2
size: S
status: dropped
claimed-by: claude/pool-words-race-told-same-lines-opposite-speakers
pr: #8446
blocked-on:
source: added with npm run pool -- add
after:
lead: director
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:55:50.722Z
branch: claude/pool-words-race-told-same-lines-opposite-speakers
---

**What.** src/director/race-told-scene.test.ts checks that opposite speakers tell a race differently. With GOLDEN_PATH_SEED=pet-run-1 on the petition branch (claude/elections-petition-filing), the second draw, Waycross, Georgia (1380956), place seed c383dee379909722186061bea6b917d0affbbc3bd7bd0004337500dcbd2bb7fb, as the new adult, composes the same text for traits at +2 and -2, beginning "Narrator: Joseph Banks just won the C...". The petition only changed which race is told first in that world; two other seeds pass, so the gap is in the scene's lines for that race's facts, not in the petition. The race-told lines likely lack a speaker line where the facts give the speaker no tie to the candidate.

**Cause.** Found in code: the race-told test (src/director/purpose-scene.ts, `purposeScene`, words its scene; the test was deleted with the scene, Nov 12) fails with "no drawn place had a race told in the year" on seeds rt-2, rt-7 and rt-8 (item Notes, Oct 29): none of the eight places the test draws had a race told that year. The lines themselves hold: on main GOLDEN_PATH_SEED=pet-run-1 passes and seven of ten fresh seeds tell the two speakers' lines differently.

**Fix.** Draw among places that had a race told that year, or draw more places, so the test does not fail for lack of a race.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the scene's lines differ by the speaker's traits, never by a roll. One rule, all 56 places: the test draws its places from all 56 and names each place and seed. Speeches, scenes and lines differ by the speaker's traits: a race told by a friendly and a hostile speaker never reads the same.

**Done when.** A second session, not the builder, runs src/director/race-told-scene.test.ts at GOLDEN_PATH_SEED=pet-run-1 and at seeds rt-2, rt-7 and rt-8 on main and sees it pass each time, with each run naming the drawn place, seed and race-told record id and the two speakers' texts differing.

**Waits on.** Nothing.

**Files.** data/english

**Notes.** lead: words. Filed by the elections wire session, Oct 28, while running the petition line's tests. Oct 29, 02:35 UTC (words session): on main, GOLDEN_PATH_SEED=pet-run-1 passes, and of ten fresh seeds rt-1 to rt-10, seven tell a race with the two speakers' lines different (Questa, New Mexico (3560870), world seed 83580b1b89219181e211855f4aa4cfdefbc9e7fd5be4eea99e80e7a972583e7d, record election-result:contest:seat:gus2025:208799:council:2:2025-11-04; Richmond, Vermont (5059200), record election-result:contest:seat:gus2025:176592:board:0:2026-03-03; Fredonia, Wisconsin (5527550), record election-result:contest:seat:gus2025:136509:board:6:2026-04-07). Seeds rt-2, rt-7 and rt-8 fail before any line is said: none of the eight places the test draws had a race told that year. The lines hold; what is left is the test's draw, which needs more places or a place drawn among those with a race that year.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:55 UTC) on branch claude/pool-words-race-told-same-lines-opposite-speakers.

- Dropped Nov 12, 2026 by the story builder for the lead (Fable A): its scene was deleted with the scene inventory (docs/design/scene-inventory.md, branch claude/story-scene-inventory); the scene's reply was read by no engine.
