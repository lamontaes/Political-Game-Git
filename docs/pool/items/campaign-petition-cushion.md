---
id: campaign-petition-cushion
title: "A campaign gathers a cushion of petition signatures above the minimum"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: governing/petition-cushion
pr:
blocked-on:
source: governing lead, Oct 30 (measurement: petitions found short)
lead: governing
claimed-at: 2026-10-30T02:09:38.972Z
---

**What.** Campaigns gathered exactly the minimum number of petition signatures and stopped, so when the clerk struck names not on the roll the filing came up short and the candidate was off the ballot. In Price UT on Oct 30 the player collected 33 and 35 of 30 in two races and the clerk found both short. Real campaigns gather well above the minimum because thin margins fail.

**Rules.** No dice: a campaign's target is its petition's minimum times one plus a researched cushion, and whether each resident signs stays their own answer. Wire to the world: the world's candidates read the same target in rivalDay as the player's headless campaign does, through one exported function.

**Done when.** src/core2/petition-cushion.test.ts passes, and a path-check run in a drawn place with its seed printed shows the player's petition collecting at least the cushioned target before the deadline and the clerk's check finding it on the ballot.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json, src/bench/path-check.ts, src/core2/petition-cushion.test.ts

**Notes.** TODO
