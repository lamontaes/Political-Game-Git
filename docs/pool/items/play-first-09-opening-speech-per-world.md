---
id: play-first-09-opening-speech-per-world
title: "The President's address is built from this world's numbers and this President, not a formula"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner's read of the playtest screenshots: the opening speech is generated per world and per president from the game's numbers, not formulaic. PR #5902 (merged after the v0.22.10 build) put the President's voice and own issues into the address, but every world still cites one number (unemployment) and keeps one eight-line shape. This item finishes it: the address reads several of the world's own numbers and records, and its length and order follow the President and the year.

**Rules.** Wire to the world: every fact line reads a record of this world (the economy, laws passed, the last election) and cites it. No hand-written player text: the lines come from the English engine's opening-speech bank.

**Done when.** In two drawn places, the opening addresses differ in length and section order, each cites at least three of its world's own records besides unemployment, and a test fails when two worlds produce the same line sequence, shown by a screenshot of each.

**Files.** src/director/opening-story.ts, src/english/english-opening-speech.ts, data/english/parts/opening-speech.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Finishes PR #5902 (merged). The opening speech is the Words lead's (src/director, src/english, data/english): the lane writes `needs-from: words` unless the Words lead takes the item. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
