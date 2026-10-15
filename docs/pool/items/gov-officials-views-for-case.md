---
id: gov-officials-views-for-case
title: "A state legislator's or member of Congress's position moves when a case is made to them, so the office scene reaches the state and federal levels"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "director-reach, PR #4508"
---

**What.** A state legislator or member of Congress in the game is an official record, not a person with views, so a case made to them moves nothing. The office scene (src/director/office-scene.ts) therefore only reaches town bodies. Give an official a position on each policy question that a case moves, read by the legislature's vote, by the same rule as a full person, then let the office scene open on a state or federal body for a player who sits there.

**Rules.** An effect is a read: the case made is read by the vote. One model, two tiers: an official's view follows the same rule as a full person's. No dice. One rule, all 56 places. Replace, never layer: the stand-in marker for the town-members-only scene is deleted in the same change.

**Done when.** In a drawn place and a played world year, a player seated in a state chamber (or the U.S. House) opens an office scene, makes the case to one member, and that member's recorded position and vote move by the player's standing with them, named by record id. Tests in src/director/office-scene.test.ts cover a state and a federal body.

**Files.** src/core2/modules/officials.ts, src/core2/modules/views.ts, src/core2/modules/legislature.ts, src/director/office-scene.ts, src/core2/data/stopgaps.json

**Notes.** Split from director-reach (PR #4508). The stopgap row for the town-members-only office scene names this work.
