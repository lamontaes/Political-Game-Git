---
id: gov-rival-campaign-day-and-causes
title: "Rival campaign days and causes for a contest"
area: gov
kind: feature
priority: 3
size: S
status: done
claimed-by: claude/campaign-causes-screen
pr: #4820
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T20:57:19.470Z
---

**What.** `causesFor` (campaigns.ts) is read by no screen, and `rivalCampaignDay` does not exist. Have rivals run their campaign day by the same choices the player has (campaign-day.ts), and show the causes a contest turns on beside the door and speech results.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place a rival's campaign day is recorded by the same acts as the player's, and the doors result names the causes it heard, by contest and act record ids.

**Files.** src/core2/campaign-day.ts, src/core2/modules/campaigns.ts, src/bench/campaign.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Looked at Oct 16 (claude/rival-campaign-day), not built. Rivals already campaign through the same acts the player's day uses: `campaignTurn` (campaigns.ts, about line 2005) asks for money with `askForDonation`, walks doors with `knockDoors`, buys ads and mail and holds an event with `holdEvent`, every few days from filing to election day, and each act writes the same cause rows (`causesFor`). What differs is the choosing: the rival's turn splits its money by trait-weighted shares and spends a fixed `rivalHoursWithJob` or `rivalHoursWithoutJob` on doors, while the player picks one of `campaignDayChoices` (campaign-day.ts) and `takeCampaignDayChoice` spends the player's own activity time. Making a rival take its day through `campaignDayChoices` and `takeCampaignDayChoice` is a replacement of `campaignTurn`'s door and event logic, not an addition, so it moves every race's balance and needs the campaign calibration tests (`campaign-calibration.test.ts`) re-read before and after. The bench half is small and separate: `src/bench/campaign.ts` (the doors case near line 88) already returns `summary(causes)` with the cause rows, but no screen lists the causes a contest turns on (`causesFor` has no reader). Suggest two items: the bench list of causes for a contest (S, play), and the rival day through the shared choices (M, gov, with calibration re-run).
