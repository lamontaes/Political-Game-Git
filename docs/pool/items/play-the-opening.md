---
id: play-the-opening
title: "The opening."
area: play
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/play.md line 142 (unchecked checklist line)"
---

**What.** After New life the opening cuts from the President in the Oval Office at night to your senators, representative, governor, state legislators and town officials, then your family at home, then you; each shot draws the real holders from the offices records, dressed for the place, with title and name, and Escape skips it. It is waiting on the speech's words (SG-PLAY-opening-without-speech) and the State of the Union is shown from the White House exterior though it is given in the House chamber (`src/bench/data/opening-pictures.json`, `stages.president`). Add the President's speech through `composeOpeningSpeech`, and show the House floor for that address. The player would notice the President actually speaking and the right room.

**Rules.** No hand-written player text: the speech is worded by the English engine through `composeOpeningSpeech` and `openingSpeechKind(year)`; no line is typed by hand; An effect is a read, not a record: the opening reads the offices records and the speech lights only the people the address names; Replace, never layer: the speechless opening stand-in is deleted when the speech lands; One rule, all 56 places: holders come from the offices records for all 56 places, no place named; Estimate, never UNKNOWN: a missing official shows the seat, never UNKNOWN; This is a game, not a spreadsheet: skipping with Escape stays; Placeholders: SG-PLAY-opening-without-speech closes only when the speech is shown.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): New life opens with the President speaking a composed address (speech and bank part ids named), lights the people it names, shows the House floor for a State of the Union, and the stopgap closes. Tests in `src/director/opening-story.test.ts` and `src/bench/opening.ts` tests. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: starts a new life and watches the President's address.

**Files.** src/bench/opening.ts, src/director/opening-sequence.ts, src/director/opening-story.ts, src/bench/data/opening-pictures.json, scripts/english-corpus/opening-speech-bank.ts

**Notes.** Checklist line from play.md; verify against main before starting.
