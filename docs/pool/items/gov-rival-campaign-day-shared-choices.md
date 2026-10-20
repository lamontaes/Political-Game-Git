---
id: gov-rival-campaign-day-shared-choices
title: "Rivals take their campaign day through the same choices as the player"
area: gov
kind: wiring
priority: 3
size: M
status: claimed
claimed-by: claude/fs11vb-rival
pr: #5268
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Looked at Oct 19 (claude, claude/rival-campaign-day), not built. The player's day lives in `src/core2/campaign-day.ts` (`campaignDayChoices`, `takeCampaignDayChoice`: canvass, event, interview, raise-money, rest), and `contextOf` there opens a day only for a filing whose person is the player. A rival's turn is `campaignTurn` in `modules/campaigns.ts`: one pass every `campaignTurnDays` that asks `donorAsksPerTurn` people for money, knocks doors for `rivalHoursWithJob`/`rivalHoursWithoutJob` scaled by the `campaigns.rival-hours` trait lean, then splits free money across ads, mail, an event, a poll. To put the rival through the same choices: (1) lift the player-only test in `contextOf` to any on-ballot filing with a living candidate; (2) build `ActOffer`s for canvass, event, raise-money and rest with reasons (coverage left, cash, the candidate's sociability and deliberation) and a `campaigns:pull` reason provider, as `credit.ts` does; (3) run `chooseAct` once per campaign day of the turn and call `takeCampaignDayChoice`; (4) delete the fixed doors and asks block. The cost to watch is speed (a choice per rival per day instead of one pass per turn) and `campaign-calibration.test.ts`, which pins turnout and money totals the new path will move. Not started because step 3 changes every world race's money and doors, and the calibration has to be re-read before it can be called better.
