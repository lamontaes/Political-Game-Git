---
id: tests-bench-player-director-stops-red-on-main
title: "src/bench/player.test.ts fails three cases on main: director stops come where the week or the jump expected none"
lead: play-first
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/player-stops
pr: #6476
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:31:17.093Z
---

**What.** On main at 7f526c5105, npx vitest run src/bench/player.test.ts fails 3 of 12. 'lets the character answer its own choices when the day advances' expects more than one self-chosen answer and gets 0; 'stops a calendar jump at a big moment's own time while the character chooses for itself' stops at 2021-01-03 00:00 instead of the moment's own time; 'Week advances seven days and a director stop ends it on its own day' gets a stop where it expects a completed week. The cases build their own fixture world, so a change in what the director stages or stops on has outrun them; the laws-and-effects lead found it while running the bench tests for the ask-before-the-roll branch, where the same three fail the same way.

**Rules.** Ask why: name the director record that now stops the day, by record id, and say whether the fixture or the engine is wrong before changing either. Never loosen a check to get green; a stop that should not come is an engine defect.

**Done when.** src/bench/player.test.ts passes 12 of 12 on main, the PR body naming by record id the stop that broke each case and the change that caused it, and the director's interrupt rule still holds in a test that a quiet day ends without a stop.

**Files.** src/bench/player.test.ts, src/bench/player.ts, src/director/ledger.ts

**Notes.** Found Oct 27 23:30 by the laws-and-effects lead; fails identically on main and on claude/ask-before-the-roll.
