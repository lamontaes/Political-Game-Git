---
id: gov-rival-campaign-day-shared-choices
title: "Rivals take their campaign day through the same choices as the player"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A rival's campaign turn (`campaignTurn` in src/core2/modules/campaigns.ts) asks for money with `askForDonation`, walks doors with `knockDoors`, buys ads and mail and holds an event with `holdEvent`, every few days from filing to election day, writing the same cause rows as the player's acts. What differs is the choosing: the rival splits its money by trait-weighted shares and spends a fixed `rivalHoursWithJob` or `rivalHoursWithoutJob` on doors, while the player picks one of `campaignDayChoices` and `takeCampaignDayChoice` (src/core2/campaign-day.ts) spends the player's own activity time. Make a rival take its day through `campaignDayChoices` and `takeCampaignDayChoice`, choosing among them from its traits, money and hours, and delete the door and event logic `campaignTurn` kept for itself.

**Rules.** No dice: the choice follows the rival's traits, money, hours and the choices the records offer. Replace, never layer: the rival's old door-and-event branch is deleted in the same change, not left beside the shared choices. One model, two tiers: a rival that is a counted person acts by the same rule. One rule, all 56 places. The change moves every race's balance, so campaign-calibration.test.ts is read before and after and the spread is stated.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a rival's campaign day is recorded by the same acts as the player's, shown by contest and act record ids, the campaigns sheet's race-turns-on list shows the rival's doors and speeches, and campaign-calibration.test.ts passes before and after with the change in turnout and margins named.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/campaign-calibration.test.ts

**Notes.** Split from gov-rival-campaign-day-and-causes when its bench half (the race-turns-on list on the campaigns sheet) was built in PR #4820; this is the engine half.
