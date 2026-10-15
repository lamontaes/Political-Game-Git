---
id: play-speech-screen
title: "The play screen offers the staged speech: four choices at each of four stages"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The engine builds a speech in parts (`speech-composition.ts` has the steps opening, body and closing, `speechPartOffers` and `choosePart`), but `/play` gives only a single 'speech' act in `src/bench/campaign.ts` with no choice of parts. Build the screen: the player picks one of four offered parts at each of four stages, short openers and closers and longer, meatier body choices on different subjects, from the English engine's speech acts and his own record and positions. The player would notice that a speech is his own composition and the crowd reacting to what he said.

**Rules.** No hand-written player text: every offered part is worded by the English engine from `data/english/parts/address.json`; none is typed into the screen; An effect is a read, not a record: the offers read the player's record and positions, and the audience reads the delivered parts; Look before you ask: the speech ruling is in OWNER-DECISIONS.md (the Suzerain example, short openers and closers, longer body choices); quote it; No dice: a listener's reaction follows their views and the speaker's standing, never a roll; Ask why: the audience's reaction cites the part that moved them; This is a game, not a spreadsheet: choosing four parts is the speech, not a form; Replace, never layer: the one-click speech act is deleted in the same change; One rule, all 56 places: no place named.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the bench player composes and delivers a speech in four stages, the delivered speech row lists the chosen parts (speech and part ids), and a named listener's stance moves with its source cited. Tests in `src/core2/speech-composition.test.ts` and `src/bench/player.test.ts`, with a browser spec. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: gives a rally speech by choosing its parts and hears how it landed.

**Files.** src/core2/speech-composition.ts, src/bench/campaign.ts, src/bench/play.mjs, data/english/parts/address.json, src/bench/data/controls.json

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).
