---
name: speech-planner
description: >
  Builds and plays any speech (a campaign or floor speech, an address, someone
  else's speech) from the one planner: planSpeech, the click rule, by-day and
  evening facts, wording draws, and the checks before sending a Words reader
  the played lines. Use when adding or changing a speech kind, outline row,
  speech part or the speech screen. Not for writing bank lines (words-engine,
  civic-prose).
---

# Speeches go through one planner

- **One planner.** `planSpeech(core, kindKey, speaker)` in `src/director/speech-outline.ts` plans every speech from a row in `src/director/data/speech-outlines.json` (points, asks). `composeBlocks` in `src/director/opening-story.ts` words the blocks (`salutation`, `occasion`, `point-<question>`, `close`). The player's picks are the planner's `chosen` input; nothing words a speech part on its own path.
- **Click rule (owner, Nov 15).** The player builds a speech one click at a time, one of four parts each; no single format. Length comes from the kind's row (`asks`, `points`); `stagesOf(kind)` is opener, one core click per ask, closer. A President's runs 5 to 20 clicks.
- **Time of day is a fact.** The speaker carries `evening` from `dayParts(minute)` (the player's clock minute is `state.player.packet?.at.minuteOfDay`). A piece that says "tonight" requires `evening`. A by-day piece exists for each occasion; check both.
- **Wording draws.** Variation is keyed `opening:<date>:<id>/<blockKey>#<draw>`; the number of tries is the `speechWordingTries` parameter, never a literal in `src/director/*.ts` (the director-numbers guard).
- **Lines are the Words lead's.** A builder never adds lines to `data/english/parts` for review; list the line needed and the Words lead writes it. Delete a twin that differs only by a contraction.
- **Before sending the Words reader.** Play the speech by day (minute 600) and in the evening (minute 1200) at two pinned places, write the played sentences to a file headed with the exact sha, and check: no "tonight" by day, one ask per point not repeated, each picked question present, a click changes the text.
- **Traps.** When a prefix key matches several bank pieces, `index` on the full key before deleting by script. A race with no seat row (a US House race) cannot build a speech; the builder returns null and registers the stopgap, never guesses.
