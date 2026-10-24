---
id: traits-campaigns-own-sd
title: "Campaign trait weights sized from Mondak's study use each trait's own spread"
area: people
kind: research
priority: 2
size: S
status: claimed
claimed-by: claude/traits-campaigns-own-sd
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T02:57:25.374Z
---

**What.** The campaign family's trait weights were calibrated against Mondak et al. 2010 rows converted with an assumed spread of 0.2 of a trait's range, before the spread fix gave each row its Table 1 value (0.22 openness, 0.26 extraversion). Seven weights still carry the old targets: volunteering, giving, answering the door, retelling a campaign story, answering a poll, speaking to a reporter and party firmness. Five research rows (campaigns.retell, press.accept-interview, campaigns.rival-hours, campaigns.party-firmness, campaigns.answer-poll) still lack the spread, so the calibration script refuses them. Give the rows their spread and refit or rescale each weight to its new target.

**Rules.** Research before building: each weight cites its Table 2 cell and Table 1 spread, or a gap row. No dice: weights size a reason, never a roll. Wire to the world: the refit uses kept calls from played years of buildBenchWorld.

**Done when.** Every campaigns and press.accept-interview row in data/research/trait-effect-sizes.json carries traitSd, scripts/traits/trait-calibrate.ts gives each a target with no refusal, each weight's citation states its new target and fit, and src/core2/modules/campaigns.traits.test.ts passes on two fresh drawn places, seeds named.

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, src/core2/data/campaigns/parameters.json

**Notes.** Filed Oct 24 by the traits lead: step 3 of docs/work-orders/lead-traits-2026-10-24.md. The civic family's Mondak weights (turnout, meetings) are rescaled in the traits-wire-civic PR.
