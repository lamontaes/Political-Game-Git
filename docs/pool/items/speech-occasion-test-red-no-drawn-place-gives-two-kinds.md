---
id: speech-occasion-test-red-no-drawn-place-gives-two-kinds
title: "The speech-occasion test finds no drawn place with speeches at two kinds of occasion at a fixed seed"
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
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: governing
source: Account lead thread "Make elections read your record", Nov 14
claimed-at:
---

**What.** `SPEECH_OCCASION_SEED=59ade6c6f5cea6a5 npx vitest run src/core2/speech-occasion.test.ts` fails with `no drawn place gave speeches at two kinds of occasion`: Oak Grove, Tennessee (4754700) gave 6 speeches, all at a party meeting; Brentwood Colony, South Dakota (4607068) gave 0; Norco, Louisiana (2255525) gave 3, all at a party meeting. It fails the same way on the clean train head b4c11bc5 and on #9248's branch. Seen: in the events a speech is given at, named on the speech record.

**Cause.** Needs cause. Measured: the three drawn places above at that seed. Either speeches at other kinds of occasion (a meeting, a hearing, a sitting) are no longer given in a played year, or the test draws too few places.

**Fix.** None until the cause is found.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test draws or pins a named place from the 56 and prints its place and seed. Never loosen a test to get green; it is pinned to a named place and seed as `pinned-tests` says.

**Done when.** A second session runs the command above on main in the drawn places named above and the test passes at that seed, and at two other seeds pinned in the test file, each in its drawn place, with the occasion kinds found named by record id in Notes.

**Waits on.** Nothing.

**Files.** src/core2/speech-occasion.test.ts, src/core2/modules/speech.ts

**Notes.** Found while gating #9248.
