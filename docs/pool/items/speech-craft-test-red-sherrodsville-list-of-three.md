---
id: speech-craft-test-red-sherrodsville-list-of-three
title: "The speech-craft test says no list of three at Sherrodsville, Ohio: expected 60 said, got 0"
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

**What.** `GOLDEN_PATH_SEED=ad63a44e36f349a3 npx vitest run src/core2/speech-craft.test.ts` draws Sherrodsville, Ohio (place key 3972242) and fails `says a list of three only for a speaker who has given enough addresses` at src/core2/speech-craft.test.ts:75 with `expected +0 to be 60`. It fails the same way on the clean train head b4c11bc5 and on #9248's branch. Seen: in the speeches a speaker gives once they have given enough addresses.

**Cause.** Needs cause. Measured: the seed above in that drawn place, red on the clean train; the block is said zero times of 60.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test draws or pins a named place from the 56 and prints its place and seed. Never loosen a test to get green; it is pinned to a named place and seed as `pinned-tests` says. No hand-written player text in code: the line comes from the English engine's banks.

**Done when.** A second session runs the command above on main in the drawn place (Sherrodsville, Ohio, place key 3972242, seed ad63a44e36f349a3) and the test passes there and at two other drawn places pinned in the test file, and the cause is named in Notes by record id.

**Waits on.** Nothing.

**Files.** src/core2/speech-craft.test.ts, src/english

**Notes.** Found while gating #9248.
