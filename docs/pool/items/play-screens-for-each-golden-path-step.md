---
id: play-screens-for-each-golden-path-step
title: "Screens for each golden path step."
area: play
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/play.md line 134 (unchecked checklist line)"
---

**What.** `/play` reaches step 4 of the golden path (filing at the real office, then campaigning), and day and skip, the place picture, the conversation with the Lie button, the journal, law here, who governs you and filing are in the bench. The remaining steps have no screens: the person card (in PR work), campaigning, election night, proposing an ordinance, negotiating, the vote and the town visibly changing. Build each on the engine's records so the player can walk the whole path in the bench. The player would notice that every step from turning 18 to the next election has a screen.

**Rules.** An effect is a read, not a record: each screen shows records an engine wrote and spends no game time; No hand-written player text: every sentence is worded by the English engine and every label is a control name; Replace, never layer: no old stand-in screen is kept beside a new one; This is a game, not a spreadsheet: the screens present the golden path only, with no extra forms; Wire to the world: each step moves votes, laws, money or people in a generated world; One rule, all 56 places: no place named in code; Speed: screens read indexes, with no world scan.

**Done when.** In a drawn place (name it and the seed) a walk-through run from turn 18 to the next election reaches each golden-path step with a screen (the furthest step reported in plain words), by `src/bench/reached.ts` and `src/bench/path-check.ts`. A full-window screenshot at 1672x941 of each new screen is attached and merged on the owner's yes, with browser specs. The owner plays it: walks from his eighteenth birthday through an election.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/bench/legislature.ts, src/bench/reached.ts, src/bench/path-check.ts

**Notes.** Checklist line from play.md; verify against main before starting.
