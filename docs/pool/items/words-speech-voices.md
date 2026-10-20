---
id: words-speech-voices
title: "Speeches cite real figures, lines fit the kind of speaker, and rhetorical craft (threes, call and response) is earned by skill"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-7xkkii
pr:
blocked-on: words-speech-part-words
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:57:07.733Z
---

**What.** The worded parts of a composed campaign speech (src/english/speech-part-words.ts) say what the candidate's record says, but a speech should also sound like its speaker. Make a speech part cite real figures from the records it rests on (a vote count, a dollar amount of a budget line, a year of service), choose lines that fit the kind of speaker (an incumbent, a challenger, a newcomer, an outsider, by their recorded office and record), and let the crafted devices of a public address (a list of three, a call and a response, a contrast) appear only as far as the speaker's recorded speaking experience earns them, on a sliding scale. The sentences come from the banks in data/english/parts through the engine, authored with origin and author where the mined bank has none.

**Rules.** No hand-written player text: every sentence comes from the English engine's banks, never typed into code or a screen. No dice: which lines a speaker uses follows their record, traits and the speeches they have already given, never a roll or a fixed percentage. Sliding scales and causes: a device is earned gradually by recorded speaking experience, and nothing turns on at a threshold. Ask why: each part cites the record ids of every figure it quotes. One rule, all 56 places: the place drawn is named in the PR body.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56, named with its seed, two candidates with different records and different speaking experience each compose a speech; the parts of the one with more experience use more crafted devices than the other's, every figure in a part matches the record id it cites, and an incumbent's lines differ from a challenger's. The test beside src/english/speech-part-words.test.ts shows it by record id, and the owner plays it: give two speeches and hear the practiced one sound practiced.

**Files.** src/english/speech-part-words.ts, src/english/speech-registers.ts, data/english/parts/speech-parts.json, data/english/parts/address.json

**Notes.** Blocked on words-speech-part-words (in PR #5196), which words each part of a composed speech. The register cards in src/english/speech-registers.ts already name which devices each setting admits; this item decides how many a given speaker has earned. The speaker's experience can be read from the finished compositions the speech-compositions table keeps (composedSpeechesOf in src/core2/speech-composition.ts).

Partly built Oct 20 on claude/political-game-pool-7xkkii (PR #5196): the figures piece. A speech part that tells a candidate's recorded vote on a bill now states the chamber's count, as the vote rows count it (src/english/speech-part-words.ts, two authored lines per side in data/english/parts/speech-parts.json; src/english/speech-voices.test.ts proves it by bill and vote record in a drawn place). A past vote from the opening's history is not a bill with a roll call, so it keeps the plain line. Still to build: lines that fit the kind of speaker (incumbent, challenger, newcomer) and crafted devices earned by recorded speaking experience on a sliding scale. The experience can be read from composedSpeechesOf in src/core2/speech-composition.ts.
