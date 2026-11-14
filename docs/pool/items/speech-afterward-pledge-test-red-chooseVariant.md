---
id: speech-afterward-pledge-test-red-chooseVariant
title: "The speech-afterward-pledge test crashes in the arc-variant chooser at a fixed seed"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
lead: governing
source: Account lead thread "Make elections read your record", Nov 14
claimed-at:
---

**What.** `GOLDEN_PATH_SEED=1a6d44d1147f10e5 npx vitest run src/core2/speech-afterward-pledge.test.ts` fails with `TypeError: Cannot read properties of undefined (reading 'variant')` at `chooseVariant` (src/director/arc-variant.ts:749), reached from `composeBinding` (src/director/purpose-scene.ts:1672) and `purposeScene` (line 260). It fails the same way on the clean train head b4c11bc5 and on #9248's branch. Seen: in the scene a candidate's accepting reply after a speech plays.

**Cause.** Needs cause. Measured: the seed above, the command above, red on the clean train. The chooser's best-scoring variant is undefined, so no variant scored for this purpose at that draw.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test draws or pins a named place from the 56 and prints its place and seed. Never loosen a test to get green; it is pinned to a named place and seed as `pinned-tests` says. No dice: a variant is chosen by its score from the world's facts.

**Done when.** A second session runs the command above on main in the drawn place and the test passes at that seed and at two other seeds pinned in the test file, each in its drawn place (place and seed named), and the cause is named in Notes by function and line.

**Waits on.** Nothing.

**Files.** src/director/arc-variant.ts, src/director/purpose-scene.ts, src/core2/speech-afterward-pledge.test.ts

**Notes.** Found while gating #9248.
