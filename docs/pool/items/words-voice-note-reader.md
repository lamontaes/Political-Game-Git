---
id: words-voice-note-reader
title: "The owner's voice notes on a batch become grades the way he talks"
area: words
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: story/voice-note-reader
pr: "#8053"
blocked-on:
lead: words
milestone: play-first
source: 'owner, Nov 9, 8:20 a.m., through the CTO: "It''s all done in the voice notes again look how I did the previous ones"'
claimed-at: 2026-11-09T13:40:00.000Z
---

**What.** The owner grades batch 2 by voice note, as he graded batches 11 to 19. The reader takes his whole transcript and the batch, finds each line he reads aloud or names by number, and turns the words he says after it into grades on that line or on the part he reads back. It also keeps the rules he states in passing for the writing rules.

**Rules.** Sliding scales and causes: his words set a strength from -1 to 1 on a sliding scale, never a pass or fail. No hand-written player text: the reader writes grades, never a line a player sees.

**Done when.** A test runs the reader on his real batch 13 voice note (docs/coordination/voice-notes/2026-10-15-words-orders-part-1.md) and grades the lines he read the way he judged them, keeps his rules, reads "five point two", "scene four" and "rating that a three", and a note on batch 2 reaches the grade map without breaking the ledger fold.

**Time box.** 2 hours.

**You will see.** Your voice note on batch 2 moves every line like the ones you praised or panned.

**Screenshot.** Not a screen; the test output in the PR body.

**Files.** scripts/dialogue-batch/voice-note-reader.ts, scripts/dialogue-batch/spoken-grades.ts, scripts/dialogue-batch/apply-grades.ts

**Notes.** 2026-11-14 (M2): #8053 and #8169 are both merged into main and on the train (reader, spoken-grades, the five rewrites; pulled is empty). What this item still needed was the click-through page's batch format (ids `scene.wording.line`, `scene.wordingLETTER.line`, scene titles); carried in this PR with a fixture in our own words.
