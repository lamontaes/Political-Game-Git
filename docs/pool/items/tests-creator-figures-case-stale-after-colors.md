---
id: tests-creator-figures-case-stale-after-colors
title: "The creator test's figures case fails on main since the skin and clothes colors: its rows and portrait checks predate the recolor"
area: play
lead: play-first
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/laws-opening-past-chosen-age
pr: #6271
blocked-on:
source: laws-and-effects lead, Oct 27 (changed-file tests of laws-opening-past-fits-the-chosen-age)
claimed-at: 2026-10-27T09:16:01.782Z
---

**What.** On clean main (e3d9d8e6f2), `src/bench/creator.test.ts` "the New game creator > offers the figures the game draws, steps them and draws the portrait" fails in two places. Since play-stop-34 (#6229, skin and clothes color swatches) merged, `appearanceRows` returns Build, Clothes, Skin and Clothes color, and the test still expects only Build and Clothes (line 64 on main). With that line updated, the portrait check at the end still fails: `portraitPng` recolors the figure by the recipe's colors, so it no longer equals the raw v2 file byte for byte. Every PR that changes `creator.test.ts` inherits the red case.

**Rules.** Never skip, disable or quarantine a test: the case is updated to what the creator now does, the four rows and a recolored portrait drawn from the same file, never dropped. Replace, never layer: the stale expectations are replaced in the same change.

**Done when.** The test expects the four rows, and its portrait check compares the portrait with the recolor of the matching v2 figure, read through the same recolor path the rooms use. It passes on main in a test run named in the PR body, and with the recolor removed it fails.

**Time box.** 1 hour, the lane agent who owns play-stop-34 or any fixer.

**Files.** src/bench/creator.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27. Seen in the changed-file tests of `laws-opening-past-fits-the-chosen-age`, which changes the same test file; reproduced on clean main. Fixed Oct 27 in PR #6271 (commit 91bca7f45d), which changes the same test file; that PR's line 1 is `laws-opening-past-fits-the-chosen-age`, so set this item done when #6271 merges.

Landed in #6271 (merged 10:11 UTC, Oct 27, laws-and-effects lead): the case expects the four appearance rows and the recolored portrait; it is a second item of that PR, so the merge did not flip it, and done is the CTO's to set.
