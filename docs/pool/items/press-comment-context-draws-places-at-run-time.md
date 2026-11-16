---
id: press-comment-context-draws-places-at-run-time
title: "press-comment-context draws up to 12 places at run time under a 30-minute limit"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: press-comment-why-answered-by-the-roll
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 16 01:26Z
---

**What.** src/director/press-comment-context.test.ts draws a seed at random unless GOLDEN_PATH_SEED is set, tries up to 12 places at run time, and has a limit of 1,800,000 ms. The pinned-test rules allow neither. Its runs on #9584 at 690f17e4 took 94.8 s at rank-m4 (Salem, Ohio), 13.9 s at yes-vote-3 (Downs, Kansas) and 16.2 s at yes-vote-6 (Bagdad, Arizona).
Seen: on #9584's gate runs.

**Cause.** Found in code: src/director/press-comment-context.test.ts, its `seed` constant reads `randomBytes` when GOLDEN_PATH_SEED is unset, and its `ATTEMPTS` loop calls `drawPlace` up to 12 times.

**Fix.** Pin its places by name with their seeds in the test file (Downs, Kansas yes-vote-3:0 and Bagdad, Arizona yes-vote-6:0 are found and quick), drop the run-time draw and the attempts loop, and bring the limit to about twice the slowest measured run, alone and beside.

**Time box.** 1 hour, one Opus session at medium.

**Rules.** Ask why: a test that passes or fails must say which place and seed it played, chosen before the run by a script, never by the luck of a run-time draw.

**Done when.** The test, built by `buildBenchWorld` at its pinned places named in the file, runs at each pinned place without GOLDEN_PATH_SEED and with no run-time draw, under a limit near twice its slowest run. A second session runs it and sees the places it names.

**Waits on.** Nothing.

**Files.** src/director/press-comment-context.test.ts

**Notes.**
