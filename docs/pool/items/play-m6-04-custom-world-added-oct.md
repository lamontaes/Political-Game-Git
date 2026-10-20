---
id: play-m6-04-custom-world-added-oct
title: "M6-04 Custom world (added Oct 12)"
area: play
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone: M6
source: "docs/roadmap/later-specs-draft.md M6-04"
---

**What.** A new game starts from real data in a random place, or from a customized world (place, demographics, ideology, turnout, party strength, economy and more), like _The Political Process_'s advanced options. (Owner: OPUS-PLAY (the new-game screen), with OPUS-CORE (world generation).)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** World generation honors every setting, and the world then runs by the same rules.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Checked Oct 20 (claude, claude/political-game-pool-76ksvw): M6-04's own command (`scripts/core2-year/custom-world.mjs`) had a hard-coded 2021 date and stopped on the current start date; fixed to advance a month from the world's own start. Run in Cullen, Louisiana (US-LA), seed 115b21e033ca0fce344785f047bc259d, with a custom settings set: all eight checks pass (settings recorded on the world; population at least the setting, 13,750 for 3,000; pay x1.5; household cash x2; outside buyers' purchases x0.75; the town's lean shifted 0.2; the cost of voting divided by 0.8; every dollar balances for a month). The new-game screen's side (the settings form reaching the build) was not run here. `passes` in features.json is the CTO's to set.
