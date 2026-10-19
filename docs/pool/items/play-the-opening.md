---
id: play-the-opening
title: "The opening."
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/play-the-opening
pr: #4778
blocked-on:
milestone:
source: "docs/coordination/play.md line 142 (unchecked checklist line)"
claimed-at: 2026-10-16T16:45:22.060Z
---

**What.** Checked against main on Oct 16: The opening speech is built and plays sentence by sentence through the English engine; what is missing is that the State of the Union still shows the White House (`opening-pictures.json` `stages.president`), and there is no opening test or browser spec. Next: The State of the Union opens on the House floor. The player would see it as a choice among people, never a form.

**Rules.** No hand-written player text: the speech is worded by the English engine through `composeOpeningSpeech` and `openingSpeechKind(year)`; no line is typed by hand; An effect is a read, not a record: the opening reads the offices records and the speech lights only the people the address names; Replace, never layer: the speechless opening stand-in is deleted when the speech lands; One rule, all 56 places: holders come from the offices records for all 56 places, no place named; Estimate, never UNKNOWN: a missing official shows the seat, never UNKNOWN; This is a game, not a spreadsheet: skipping with Escape stays; Placeholders: SG-PLAY-opening-without-speech closes only when the speech is shown.

**Done when.** A test in src/director/opening-story.test.ts asserts the picture for the `state-of-the-union` kind is the House floor and an inaugural year keeps its picture, in a drawn place (buildBenchWorld, seed named in the PR body), plus a browser spec. The owner plays it: The State of the Union opens on the House floor.

**Files.** src/bench/opening.ts, src/director/opening-sequence.ts, src/director/opening-story.ts, src/bench/data/opening-pictures.json, scripts/english-corpus/opening-speech-bank.ts

**Notes.** Checklist line from play.md; verify against main before starting.
