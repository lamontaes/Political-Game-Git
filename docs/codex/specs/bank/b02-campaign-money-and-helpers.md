# Campaign money and helpers, scaled to the place (bank id b02, phase P1 council journey)

## What the player experiences

You start your campaign alone, with your own savings and the people you know. A small-town council race costs what yard signs, palm cards and a few hundred stamps cost; a big-city or statewide race costs far more because there are far more doors and mailboxes, and the game never tells you a target, it just prices what you try to do. You raise money by asking people you know: your aunt, your old boss, the friend from church. A few asks are played; the rest happen in your call-time routine, and each person gives or doesn't from their own means, what they think of you, and the legal limit. You ask friends and family to help, and they say yes or no for their own reasons. Volunteers you meet campaigning can join. If the treasury can pay a salary, you can hire a campaign manager, someone with real campaign experience you found through people you know, who then plans your weeks.

## Owner decisions this rests on

- "Campaign money scales like real life with the place; raised from people you know. You usually start alone; recruit friends, family, volunteers; hire a manager only if you can afford it."
- Staff are persistent people whose results come from skill, potential, personality and passion (Register line 30; Constitution item 12).
- Zero dice; no fixed percentages; nothing blank; real data calibrates the start only.

## Existing code it must use

- `src/simulation/campaigns.ts:594 fileCampaign`, `:656` staff list, `:798-826` writes each helper as a `volunteer:campaign-staff` unpaid work relationship. Every caller passes `staffPersonIds: []` (`presentation/campaign-projection.ts:1080`, `presentation/nationwide-candidacy.ts:200`, `presentation/congress-candidacy.ts:213`): "start alone" already holds; there is no way to add a helper after filing.
- `src/simulation/campaign-money-sources.ts:24 CAMPAIGN_MONEY_SOURCES` (fundraising and own-money built; loans, party, public financing, leftover unbuilt); `:66 recordCampaignFundraiserReceipts` manufactures no donor and records "no monetary ask" today.
- `src/simulation/campaign-compliance.ts:240 campaignCompliancePackFor`, `:507 assessKentuckyCampaignContribution`: contribution limits, one state only.
- `src/simulation/campaign-operating-costs.ts:31 UNRESEARCHED_OPERATING_COSTS`: eight cost categories with no amounts; `:133 payRecordedCampaignOperatingBill` pays real bills.
- `data/research/campaign-reality/campaign-calibration.json`: door/phone rates and a USPS postage figure; office-level cost values are marked UNKNOWN.
- `src/simulation/campaign-life-activities.ts:262 activeStaffPersonIds`, `:1295 supportRequestDecision`; `src/simulation/campaign-routine.ts:49` (fundraising routine already exists as "Fundraising calls").
- `src/simulation/campaign-weekly-plans.ts:708 projectCampaignWeek`, `:966 commitCampaignWeek`; `campaign-weekly-plan-integrity.ts:90` requires a plan proposer to be staff: the manager proposes here.
- `src/simulation/campaign-polling.ts:60 surveyWorkDays`: the pattern for experience from work history.
- `src/simulation/living-world/official-views.ts:301 peopleKnownTo`: who you know.

## What to change

1. **Add a helper after filing.** Extract `campaigns.ts:798-826` into `addCampaignHelper(world, {campaignId, personId, role: "volunteer" | "manager", pay})`; `fileCampaign` calls it. Manager role = paid work relationship whose pay is a resource flow from the committee treasury through `payRecordedCampaignOperatingBill`.
2. **Asking someone to help.** `askToHelp(world, {campaignId, personId})` via `evaluateDecision` (help / decline) from the person's view of the candidate, relationship warmth/kinship, free hours (work schedule), traits. Writes the event and, on yes, `addCampaignHelper`. Offered to Session 4's scenes (played) and as a choice on the campaign screen listing people you know. Helpers' recorded hours add to `modelCampaignFieldReach` and petition gathering (b01).
3. **Hiring a manager.** Candidates for the job: people the player knows, or people the party chapter organizer knows, whose work history includes campaign roles (`service:campaign-*` occupation, days counted like `surveyWorkDays`). Salary from a researched range for campaign manager pay by electorate size (one search, cited, ≤10 min); unread places estimated from similar-size places. The hire is offered only when the treasury covers the salary to election day; the person accepts or not through `evaluateDecision`. Once hired, the manager proposes the weekly plan in `projectCampaignWeek`, and plan quality reads their experience and traits.
4. **Donors are people you know.** If queued Q1 part 3 (`CampaignAsk`, generic `assessCampaignContribution`) has landed, reuse it; otherwise build it here as that brief specifies (means × view × limit, `randomness: "none"`, per-state pack, no pack → estimated limit from similar states, never zero). Ask list = `peopleKnownTo` + campaign contacts + chapter members. A few asks are played scenes; the fundraising routine block works the rest of the list in a stable order.
5. **Costs priced, not targeted.** Fill `UNRESEARCHED_OPERATING_COSTS` with researched unit prices (yard sign, palm card, postage per piece from the calibration file, print ad, filing fee from b01). A campaign's spending is units × the place's own counts (households, registered voters from the world). This is how cost scales with the place; there is no budget table by office.
6. **Player view.** Campaign screen shows treasury, who gave, who helps, what was bought. A one-line comparison "races like this here usually spend about $X" is computed from the game's own recorded spending in similar-size places (spending reports), and from the research range only until the world has its own.

## Must NOT build

- Aggregate "donor pool" money, a raise-per-hour rate, or any fixed share of people who give.
- A budget target or cost table keyed by office title.
- A second staff system beside work relationships; a paid manager the treasury cannot pay.
- Authored donor or recruiting dialogue.
- More Kentucky-named functions or any one-state rule.
- Ads, debates and speeches (other bank items; Session 22 owns campaign scenes).

## Done when (proof in a played game)

- New game, random small town: file, treasury starts at zero plus any own money; ask three people you know (one played scene) and see named gifts or refusals with reasons; recruit a sibling who says yes and a friend who says no; buy signs priced from the unit table. No manager is offered (treasury too small).
- Second random large city: same steps, costs per voter contact match the same unit prices, total spending larger because the place is larger; once the treasury covers a salary, a manager with campaign history is offered, hired, and proposes the next week's plan.
- Tests: `campaign-helpers.test.ts` (same world → same answers; helper hours raise reach; manager refused when unaffordable), `campaign-donors.test.ts` (supporter with means gives ≤ limit; opposer declines), `campaign-operating-costs.test.ts` (cost scales with household count, unit prices unchanged).

## Depends on

Session 22 (campaign scenes), Session 4 (scenes), queued Q1 part 3 (donors), b01 (petition helpers), Session 13 (filing).

## Open questions for the owner

None.
