---
id: words-opening-speech-per-world
title: "The opening address is composed per world: the speaker's personality and the world's numbers change it"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: words/opening-speech-per-world
pr: #5902
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T05:07:23.850Z
---

**What.** The owner, Oct 24: the opening speech seems pretty fixed right now; at the start of every game the English generator should compose it, since every world is different, so the speeches differ by the person, their personality and the world. The opening address is composed in src/english/english-opening-speech.ts from the world's records. This item makes the address the speaker gives depend on the speaker's recorded traits and on the world's own numbers (prices, jobs, the laws in force), so two worlds give two different addresses, each line citing the record it came from.

**Rules.** No hand-written player text: the address is the English engine's composition from bank pieces and records, never typed text. Wire to the world: every claim in the address cites a record of that world, and a different world gives different words.

**Done when.** In two played worlds (buildBenchWorld) in drawn places and seeds the builder did not choose, the opening addresses differ, each line names the record id and number it cites, and a test beside src/english/english-opening-speech.ts shows a trait change on the speaker changing the address.

**Files.** src/english/english-opening-speech.ts, src/director/opening-story.ts, data/english/parts/opening-speech.json

**Notes.** TODO
