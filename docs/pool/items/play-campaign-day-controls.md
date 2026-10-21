---
id: play-campaign-day-controls
title: "Play controls for the campaign day choices, the speech parts and joining a party, and the doors-knocked count"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/campaign-day-controls
pr: #4805
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T19:36:29.492Z
---

**What.** Play has no controls for `campaignDayChoices` (src/core2/campaign-day.ts), the speech parts, or joining a party (`joinParty`, src/core2/modules/parties.ts), and the bench does not read `doorsKnockedCount`. Add the controls to src/bench/data/controls.json and the bench so a candidate can run a campaign day and join a party from the game. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No hand-written player text (controls and lines come from controls.json and the English engine); an effect is a read; no dice; one rule, all 56 places; the chain is the acceptance.

**Done when.** In a played year in a drawn place, the player joins a party, runs a campaign day by choosing among the day's choices, and the doors knocked show on the campaign screen, each traced to its record id. A test in src/bench proves the controls resolve through the engine.

**Files.** src/bench/data/controls.json, src/bench/campaign.ts, src/core2/campaign-day.ts, src/core2/modules/parties.ts

**Notes.** Split out of gov-needs-opus-gov-165 (line 170 of OPUS-GOV.md). The engines exist and are tested (campaign-day.test.ts, party-filing.test.ts); only the play layer is missing.
