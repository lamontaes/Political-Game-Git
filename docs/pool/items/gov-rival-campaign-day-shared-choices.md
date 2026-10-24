---
id: gov-rival-campaign-day-shared-choices
title: "Rivals take their campaign day through the same choices as the player"
area: gov
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5268
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A rival's campaign turn (`campaignTurn` in `src/core2/modules/campaigns.ts`) used to run a fixed sequence of asks for money and door knocks. Make it take its day through the same acts and the same code as the player's day (`campaignDayChoices` and `takeCampaignDayChoice` in `src/core2/campaign-day.ts`): canvass the doors, hold an event, give an interview, call for money, or rest, chosen by the rival's own money, standing and traits (`rivalDay`), and delete the fixed doors-and-asks block.

**Rules.** No dice: a score from the rival's cash, recognition, holding the seat and traits decides the act, never a roll. Replace, never layer: the fixed doors-and-asks block in `campaignTurn` is deleted in the same change. One model, two tiers: the player's day and a rival's day run through the same take-the-choice code. Numbers in the parameter table: the `rival*` weights in `src/core2/data/campaigns/parameters.json` are TUNABLE with spreads.

**Done when.** In a played world (buildBenchWorld, a place drawn from all 56 and a seed named in the PR body) a rival campaign's turn takes its acts through `takeCampaignDayChoice`, a poorer or less known candidate leans on calls and doors and a richer or better known one on events and the press, shown by campaign record ids in src/core2/campaign-turn.test.ts and src/core2/campaign-day.test.ts, and the old fixed doors-and-asks block is gone.

**Files.** src/core2/campaign-day.ts, src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json, src/core2/campaign-turn.test.ts

**Notes.** Specification written on PR #5268 from the owner's Oct 20 ruling and the branch's change; the older notes below are history.

Looked at Oct 19 (claude, claude/rival-campaign-day), not built. The player's day lives in `src/core2/campaign-day.ts` (`campaignDayChoices`, `takeCampaignDayChoice`: canvass, event, interview, raise-money, rest), and `contextOf` there opens a day only for a filing whose person is the player. A rival's turn is `campaignTurn` in `modules/campaigns.ts`: one pass every `campaignTurnDays` that asks `donorAsksPerTurn` people for money, knocks doors for `rivalHoursWithJob`/`rivalHoursWithoutJob` scaled by the `campaigns.rival-hours` trait lean, then splits free money across ads, mail, an event, a poll. To put the rival through the same choices: (1) lift the player-only test in `contextOf` to any on-ballot filing with a living candidate; (2) build `ActOffer`s for canvass, event, raise-money and rest with reasons (coverage left, cash, the candidate's sociability and deliberation) and a `campaigns:pull` reason provider, as `credit.ts` does; (3) run `chooseAct` once per campaign day of the turn and call `takeCampaignDayChoice`; (4) delete the fixed doors and asks block. The cost to watch is speed (a choice per rival per day instead of one pass per turn) and `campaign-calibration.test.ts`, which pins turnout and money totals the new path will move. Not started because step 3 changes every world race's money and doors, and the calibration has to be re-read before it can be called better.

Sent back 2026-10-20 from PR #5268 (branch claude/rival-campaign-day): the owner's Oct 20 ruling asks for rivals to choose among the campaign acts by money, standing and traits (a chooser pass), and the branch keeps a fixed money-then-canvass sequence; it also adds owner notes in code comments; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5268 (branch claude/rival-campaign-day): the chooser splits only calls and doors; the owner's Oct 20 ruling asks rivals to choose among the player's own campaign day acts (campaignDayChoices: ads, staff, events, press as well) by money, standing and traits; finish on that branch, merge main into it first.
