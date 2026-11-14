---
id: speech-afterward-pledge-test-red-choose-variant
title: "A candidate who comes over after a speech crashes the game: the scene finds no door variant to play"
area: elections
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude (views thread)
pr: 9283
after:
blocked-on:
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
lead: governing
source: Account lead thread "Make elections read your record", Nov 14
claimed-at:
---

**What.** A new game at Chelsea, South Dakota (replay number 28f331d9b1d777cc) stops on its second week with "Cannot read properties of undefined (reading 'variant')", on every train head from the fold of #9224 to 9ed4bf9c (the Train's bisect, Nov 14). The same crash: `GOLDEN_PATH_SEED=1a6d44d1147f10e5 npx vitest run src/core2/speech-afterward-pledge.test.ts` fails with `TypeError: Cannot read properties of undefined (reading 'variant')` at `chooseVariant` (src/director/arc-variant.ts:749), reached from `composeBinding` (src/director/purpose-scene.ts:1672) and `purposeScene` (line 260). It fails the same way on the clean train head b4c11bc5 and on #9248's branch. Seen: in the scene a candidate's accepting reply after a speech plays.

**Cause.** Found in code: the speech-afterward scene (`src/director/data/situation-types.json`, a candidate comes over after a speech heard in person) has purpose ask-support. Since the door scenes' rulings 62 to 71, every ask-support variant in `src/director/data/arc-variants.json` is kept for a door (`onlyFor` petition false), and a speech heard names no petition, so `chooseVariant` (`src/director/arc-variant.ts`) filtered every variant out and read `scores[0].variant` of an empty list, called from `composeBinding` (`src/director/purpose-scene.ts`). It shows wherever a speech heard stages that scene; #9224's candidates answering from their own lives made one happen at Chelsea SD. Only the door families can reach an empty list: ask-signature and ask-support keep no variant open to every cause, and the other eight families keep at least one that is.

**Fix.** A cause no variant is open to plays the purpose's own arc (`purpose-arcs.json`), which ask-support keeps with its own lines for a speech (keyed vote-wanted in `data/english/parts/scene-talk.json`), as the scene did before the door variants were kept for doors. `chooseVariant` returns null when no variant is open, before reading anything; `composeBinding` asks `hasArcFor` (an open variant, or the purpose's own arc) before composing and skips a scene that has neither, never by a catch or a default line.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test draws or pins a named place from the 56 and prints its place and seed. Never loosen a test to get green; it is pinned to a named place and seed as `pinned-tests` says. No dice: a variant is chosen by its score from the world's facts.

**Done when.** A second session runs the command above on main in the drawn place and the test passes at that seed and at two other seeds pinned in the test file, each in its drawn place (place and seed named), and the cause is named in Notes by function and line.

**Waits on.** Nothing.

**Files.** src/director/arc-variant.ts, src/director/purpose-scene.ts, src/core2/speech-afterward-pledge.test.ts, src/director/arc-open-for-cause.test.ts (new)

**Notes.** Found while gating #9248. Nov 14 (claude, views thread): cause found as above. The new-game replay at Chelsea SD plays four weeks, and the pledge test passes at 1a6d44d1147f10e5. Pinned test `src/director/arc-open-for-cause.test.ts`.
