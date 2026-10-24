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

**What.** Rival candidates must choose among the same campaign acts the player can take each day. Their own money, standing and traits determine the relative scores for calls, doors, an event, an offered interview and rest. Replace the fixed calls-and-doors turn with the shared campaign-day choices and action reader, preserving the existing campaign funding and interview records.

**Rules.** No dice: the rival selects actions from their recorded money, standing and traits rather than a roll. Sliding scales and causes: act scores change smoothly with those facts. Replace, never layer: the rival uses the player's existing campaign-day actions instead of a second implementation of their effects.

**Done when.** In a played world built with buildBenchWorld in a place drawn from all 56, a rival's recorded day choices use the shared campaignDayChoices and takeCampaignDayChoice path. The named test shows the poor/rich and unknown/known score differences, an available event and interview, and their action record ids, with the place and independent seed in the PR body. The fixed duplicate calls-and-doors block is removed and the changed-file checks pass.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/campaign-turn.test.ts, src/core2/data/campaigns/parameters.json

**Notes.** The older notes below are history.

Looked at Oct 19 (claude, claude/rival-campaign-day), not built. The player's day lives in `src/core2/campaign-day.ts` (`campaignDayChoices`, `takeCampaignDayChoice`: canvass, event, interview, raise-money, rest), and `contextOf` there opens a day only for a filing whose person is the player. A rival's turn is `campaignTurn` in `modules/campaigns.ts`: one pass every `campaignTurnDays` that asks `donorAsksPerTurn` people for money, knocks doors for `rivalHoursWithJob`/`rivalHoursWithoutJob` scaled by the `campaigns.rival-hours` trait lean, then splits free money across ads, mail, an event, a poll. To put the rival through the same choices: (1) lift the player-only test in `contextOf` to any on-ballot filing with a living candidate; (2) build `ActOffer`s for canvass, event, raise-money and rest with reasons (coverage left, cash, the candidate's sociability and deliberation) and a `campaigns:pull` reason provider, as `credit.ts` does; (3) run `chooseAct` once per campaign day of the turn and call `takeCampaignDayChoice`; (4) delete the fixed doors and asks block. The cost to watch is speed (a choice per rival per day instead of one pass per turn) and `campaign-calibration.test.ts`, which pins turnout and money totals the new path will move. Not started because step 3 changes every world race's money and doors, and the calibration has to be re-read before it can be called better.

Sent back 2026-10-20 from PR #5268 (branch claude/rival-campaign-day): the owner's Oct 20 ruling asks for rivals to choose among the campaign acts by money, standing and traits (a chooser pass), and the branch keeps a fixed money-then-canvass sequence; it also adds owner notes in code comments; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5268 (branch claude/rival-campaign-day): the chooser splits only calls and doors; the owner's Oct 20 ruling asks rivals to choose among the player's own campaign day acts (campaignDayChoices: ads, staff, events, press as well) by money, standing and traits; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5268 (branch claude/rival-campaign-day): current main conflicts in src/core2/campaign-turn.test.ts, and the body explicitly lacks played-world year/record-ID proof while the item acceptance is still TODO; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5268 (branch claude/rival-campaign-day): conflict and spec repaired, but Done-when act-mix row still explicitly Not shown; supply the drawn played-world campaign record proof; finish on that branch, merge main into it first.
