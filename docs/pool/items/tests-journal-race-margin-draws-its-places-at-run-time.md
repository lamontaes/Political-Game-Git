---
id: tests-journal-race-margin-draws-its-places-at-run-time
title: "Pin the journal race-margin test to named places and seeds so it is never red by draw"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: Gate of pull request 9512, Nov 16 (red on the clean Train and on the branch, a different seed each time)
lead: journal
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** src/director/journal-race-margin.test.ts is red on the clean Train and on branches, on a different draw each run, so no builder can tell its own red from the draw's.
A gate that shows a red on the branch and a red on clean for different seeds proves nothing about either.
Seen: seed 5ca1891fde77d281558034a94b54f18b9030c45d on the 9512 branch, and seed f55dbad03458a7034c943706cb2d1bc473159300 at Casper Mountain WY (key 5613222, world seed 0a313467461b1355aeed78be6f9fe1d9317f9ad79312e025ca268894192c2f49) on clean 892427ec: "no claimed margin checked".

**Cause.** Found in code: src/director/journal-race-margin.test.ts takes its seed from `randomBytes` (line 26) and draws up to four places with `drawPlace`, stopping when an unopposed race and a margin claim have both been seen, so a draw with no such race fails the "no claimed margin checked" assertion.

**Fix.** Pin two named places and seeds, one with an unopposed race and one with a close and a wide count, found by a script outside the test (capped at one hour, naming the pick and what it passed over), each about a minute, and delete the random seed and the draw loop (skills `pinned-tests`, `drawn-place-tests`).

**Time box.** 2 hours for a Sonnet session.

**Rules.** One rule, all 56 places: the two pinned places are data in the test, and the assertions are not loosened and nothing is skipped.

**Done when.** A second session runs src/director/journal-race-margin.test.ts three times on main at Casper Mountain WY (key 5613222) and one other named place and it passes the same way each time at its two named places, and it fails once when the journal claims a margin the result does not show.

**Waits on.** Nothing.

**Files.** src/director/journal-race-margin.test.ts

**Notes.** Filed Nov 16 by hand on the 9512 branch.
