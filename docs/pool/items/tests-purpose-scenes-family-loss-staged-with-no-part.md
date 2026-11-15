---
id: tests-purpose-scenes-family-loss-staged-with-no-part
title: "A lost race is talked over at home even when no relative put work or money into it (Gregory, South Dakota)"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "F5, Nov 14, 2026, while carrying #8792: src/director/purpose-scenes.test.ts failed on a drawn seed"
checked:
---

**What.** `src/director/purpose-scenes.test.ts` ("a filing and a count fire the household's scenes in the lines that play, over a full year") expects that a lost race with a filer who lives with someone and no relative who worked or gave money to it stages no `family-loss` scene. Drawn as Gregory, South Dakota (4626180), run seed `57b40c6a2599b433`, the filer of `filing:contest:seat:gus2025:205382:council:0:2025-04-01:person_017547108f56b7fd` has a `family-loss` sitting anyway ("no part, no talk"), alongside a `race-lost` venue scene. Seen: after a lost race the player is talked to at home by a relative who did nothing for the race.

**Cause.** Needs cause. Looked at: the failing assertion at `purpose-scenes.test.ts:306` (`partIn(filer, "election-result:<contest>")` is false, `sitting("family-loss")` is not undefined) and the item `words-family-loss-scene-the-part-they-played` that cast the scene only for a relative with a part. Not traced: whether a second producer stages `family-loss` without the part (`src/director/family-stake.ts`, `src/director/purpose-scene.ts`), or `partIn` misses a part the producer found.

**Fix.** None until the cause is found.

**Time box.** 1 hour for one session.

**Rules.** One engine per mechanic; the scene is cast from records, never by chance.

**Done when.** A second session runs `purpose-scenes.test.ts` with `GOLDEN_PATH_SEED=57b40c6a2599b433` and it passes, and plays a lost race in that place where no relative took part: no home scene is staged for it.

**Waits on.** Nothing.

**Files.** src/director/family-stake.ts, src/director/purpose-scene.ts, src/director/purpose-scenes.test.ts
