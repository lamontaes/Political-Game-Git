---
id: owner-territory-president-on-government-screen
title: "Should a territory town's Government screen show the president and vice president, though its voters do not choose them?"
area: play
kind: owner-decision
priority: 3
size: S
status: done
claimed-by: claude/political-game-pool-yucp92-e
pr: #5236
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:53:52.214Z
---

**What.** A territory town's Government screen showed neither the President nor the Vice President, because their seats do not cover a place whose voters have no presidential electors. The owner ruled on Oct 19 that the screen shows them, marked as not chosen by this place's voters. The key-people list now includes both for every town, and each row carries whether this place's voters choose them.

**Rules.** No hand-written player text: the mark is a control name in controls.json. One rule, all 56 places: whether a place chooses the President comes from the 2024 presidential results data, not a named place. An effect is a read: the screen reads the flag.

**Done when.** In a drawn territory town and a drawn state town (buildBenchWorld, place and seed named), governmentView lists the President and Vice President with chosenByHere false for the territory and true for the state, proven by src/bench/government-territory.test.ts.

**Files.** src/core2/opening-key-people.ts, src/core2/electorate-places.ts, src/bench/government.ts, src/bench/play.mjs, src/bench/data/controls.json

Ruled in OWNER-DECISIONS.md, Oct 16/Oct 19. Built by PR #5236.

**Notes.** Closes the ruling in docs/coordination/OWNER-DECISIONS.md ("Territory town's Government screen"). Built on claude/political-game-pool-yucp92-e.
