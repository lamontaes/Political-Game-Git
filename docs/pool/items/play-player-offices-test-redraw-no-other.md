---
id: play-player-offices-test-redraw-no-other
title: "The player-offices test redraws a place with no other open office, naming why"
area: play
lead: play-first
kind: cleanup
priority: 3
size: S
status: done
claimed-by: play-first/player-offices-test-redraw
pr: #6930
blocked-on:
milestone: play-first
source: Merger 0, Oct 30 (Campanillas, Puerto Rico, seed c14b90afe1990222 failed "other offices still hold contests")
claimed-at: 2026-10-30T08:10:00.000Z
---

**What.** After #6908 the player-offices test redraws a place whose world files nothing outside the player's offices. A place with no other open office at all (Campanillas, Puerto Rico, where the player's choices are every open contest) failed an earlier assertion instead. It is now redrawn and named the same way.

**Rules.** One rule, all 56 places: the test draws places and names each redraw and why. Replace, never layer: the failing assertion becomes the redraw.

**Done when.** The test passes on seed c14b90afe1990222 (redrawn to Belknap, Montana) and on a random draw.

**Time box.** 30 minutes, Sonnet.

**You will see.** Nothing; a test.

**Screenshot.** None.

**Files.** src/bench/player-offices.test.ts

**Notes.** From Merger 0 after #6908 merged.
