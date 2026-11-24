---
id: tests-local-address-versions-draws-its-seed
title: "local-address-versions.test draws a clock seed and repeats a greeting in 3 of 10 worlds on seed f4e1086665bffa8b"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread "Give rivals more than one issue", Nov 14 (coordinator asked for the pairing that reproduces it)
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** `src/director/local-address-versions.test.ts` passes on some runs and fails on others, so it is red by draw. The player sees the cause on the failing draw: the governor's or mayor's greeting, "Everybody in this room, and everybody watching.", opens the address in three of ten worlds, so addresses read alike. Seen: in the opening of a governor's or mayor's address in Albright WV, Ocean View NJ and Fort Jesup LA.

**Cause.** Measured: it is not state shared between worlds built in one process and not caused by the term read's map. The run seed defaults to `randomBytes(8)` (line 21 of the test), and `LOCAL_VERSIONS_SEED=f4e1086665bffa8b` alone, with no other file in the run, fails on the Train head da2b7064 before PR 1's change with the one repeat "Everybody in this room, and everybody watching." in Albright, West Virginia (5400748), Ocean View, New Jersey (3454600) and Fort Jesup, Louisiana (2226665), draws 1, 5 and 7; the default draw passes on other seeds.

**Fix.** Pin the seed and the ten worlds named in the test (the pinned-tests rule), choosing them from the draws that hold an address; then give the greeting's repeat a second wording where the three places take it, so the bank holds enough greetings for ten worlds.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Never loosen a test: the "no sentence in more than two of ten worlds" bound stays. One rule, all 56 places: the pins name places in the test file and no place in logic.

**Done when.** A second session runs the test at its pinned seed and ten drawn places and sees it pass in under about two minutes, and replays `LOCAL_VERSIONS_SEED=f4e1086665bffa8b` and sees it pass too.

**Waits on.** Nothing.

**Files.** src/director/local-address-versions.test.ts, data/english/parts/opening-speech.json

**Notes.** Filed Nov 14 from PR 1 of the town-level jobs, pay and prices work. The Words lead reads the greeting bank.
