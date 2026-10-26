---
id: play-first-09-opening-speech-per-world
title: "The President's address is built from this world's numbers and this President, not a formula"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr: #6103
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** The owner's read of the playtest screenshots: the opening speech is generated per world and per president from the game's numbers, not formulaic. PR #5902 (merged after the v0.22.10 build) put the President's voice and own issues into the address, but every world still cites one number (unemployment) and keeps one eight-line shape. This item finishes it: the address reads several of the world's own numbers and records, and its length and order follow the President and the year.

**Rules.** Serves LAW.md §3, The opening and speeches; LAW.md §10, The owner's read of the Oct 24 screenshots. Wire to the world: every fact line reads a record of this world (the economy, laws passed, the last election) and cites it. No hand-written player text: the lines come from the English engine's opening-speech bank.

**Done when.** In two drawn places, the opening addresses differ in length and section order, each cites at least three of its world's own records besides unemployment, and a test fails when two worlds produce the same line sequence, shown by a screenshot of each.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Two new games in two drawn places open with addresses of different length and shape, each citing that world's own numbers and that President's own issues.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/opening-story.ts, src/english/english-opening-speech.ts, data/english/parts/opening-speech.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Finishes PR #5902 (merged). The opening speech is the Words lead's (src/director, src/english, data/english): the lane writes `needs-from: words` unless the Words lead takes the item. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Merger 3, October 26: PR6103 completes the bounded bench speech implementation in words-opening-address-numbers-order-implementation. Original stays open for owner installed-build acceptance under the October25 ruling. Own drawn Sa ilele American Samoa and Los Heroes Puerto Rico show different length/order and macro-record facts; existing scene backdrop defect is separately play-opening-address-empty-waiting-room.
