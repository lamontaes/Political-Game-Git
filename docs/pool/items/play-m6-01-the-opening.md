---
id: play-m6-01-the-opening
title: "M6-01 The opening"
area: play
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone: M6
source: "docs/roadmap/later-specs-draft.md M6-01"
---

**What.** The owner's approved cinematic opening: letterbox bars and the President's speech (inaugural or State of the Union), with cutaways to your representatives, state, town, family and you. Numbers live in an openable ledger. (Owner: OPUS-PLAY.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** A new game in a random place opens with that place's officials and family, and the speech's words come from the engine.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Checked Oct 20 (claude, claude/political-game-pool-76ksvw): the sequence (President, Congress, state, family, then home; everyone pointed out for a recorded reason) is covered by `src/director/opening-story.test.ts`, and the claim that two new games' openings differ is now covered by `src/director/opening-differ.test.ts`: Dubois, Wyoming (5621415) against Erwin, South Dakota (4619860), seed odseed1, same stages, different people and a different address. Not checked here: the letterbox and cutaway presentation in the browser, "every number is in the ledger button", loading during the loading screen, and Escape opening only options and quit.
