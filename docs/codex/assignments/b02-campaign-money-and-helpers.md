# B02 Campaign money and helpers, scaled to the place

Bank id b02 · Phase P1 (council journey) · Unlocks step 3 of the golden path: "campaigns by meeting people" (the people who give, help and circulate).
Code checked at origin/main 1ee0abcda.

## What the player experiences

You start alone, with your own savings and the people you know. A small-town council race costs what yard signs, palm cards and stamps cost. A big-city or statewide race costs far more because there are more doors and mailboxes. The game never gives you a target; it prices what you try to do. You raise money by asking people you know: your aunt, your old boss, a friend from church. A few asks are played; the rest happen in your call-time routine, and each person gives or does not from their own means, what they think of you, and the legal limit. You ask friends and family to help and they say yes or no for their own reasons. Volunteers you meet can join. Once the treasury can pay a salary you can hire a campaign manager with real campaign experience, who then plans your weeks.

## Owner decisions it rests on

- "Campaign money scales like real life with the place; raised from people you know. You usually start alone; recruit friends, family, volunteers; hire a manager only if you can afford it."
- Staff are persistent people whose results come from skill, potential, personality and passion (Register line 30; Constitution item 12).
- Zero dice, no fixed percentages, nothing blank, estimate and mark estimated, real data calibrates the start only, one rule for all 50 states/D.C./territories, one writer per kind of record, delete what you replace.

## Existing code to extend (verified)

- `src/simulation/campaigns.ts:594 fileCampaign`. Staff list read at `:656` (`canonicalIds(input.staffPersonIds)`), each helper written as a `volunteer:campaign-staff` unpaid work relationship in the loop at `:798-826` (relationship at :800-805, `compensation: "unpaid"` at :806). Callers pass `staffPersonIds: []` in tests (campaigns.test.ts:384 etc.); the spec's three presentation callers were not re-grepped to exact lines, so Codex must `grep -rn staffPersonIds src/presentation` and confirm. "Start alone" holds. There is no way to add a helper after filing.
- `src/simulation/campaign-money-sources.ts:24 CAMPAIGN_MONEY_SOURCES` (fundraising and own-money "built"; candidate-loan, party-committee, public-financing, bank-loan, leftover-funds, outside-spending "unbuilt"); `:66 recordCampaignFundraiserReceipts` states in its comment that it manufactures no donor, ask, pledge or payment.
- `src/simulation/campaign-compliance.ts:240 campaignCompliancePackFor`, `:507 assessKentuckyCampaignContribution`. One-state limit rule. Queued Q1 part 3 (`briefs-queued-2026-10-05.md:20`) renames it `assessCampaignContribution` and adds `CampaignAsk`. Not landed (grep for `CampaignAsk` and `assessCampaignContribution` finds nothing).
- `src/simulation/campaign-operating-costs.ts:31 UNRESEARCHED_OPERATING_COSTS`. Eight categories (office, printing, postage, travel, events, phones-and-software, food, bank-fees), each an empty object. `:133 payRecordedCampaignOperatingBill` pays real bills.
- `data/research/campaign-reality/campaign-calibration.json` (door/phone rates, USPS letter rate $0.68 then $0.73 in 2024) and `campaign-evidence.json` (Massachusetts 2022 averages; school-board spending bands). Office-level cost values are UNKNOWN in it.
- `src/simulation/campaign-life-activities.ts:262 activeStaffPersonIds`; `:1295 supportRequestDecision` (a private function, used at :1501); do not make a second help decision.
- `src/simulation/campaign-routine.ts:49` (fundraising routine "Fundraising calls" exists); `campaign-life-types.ts:191` work type.
- `src/simulation/campaign-weekly-plans.ts:708 projectCampaignWeek`, `:966 commitCampaignWeek`; `campaign-weekly-plan-integrity.ts:90-131` requires the plan proposer to be campaign staff (error at :131). The manager proposes here.
- `src/simulation/campaign-polling.ts:60 surveyWorkDays` (pattern: experience counted from work history by occupation classification, `isSurveyOccupation` at :53).
- `src/simulation/living-world/official-views.ts:301 peopleKnownTo`; `src/simulation/decisions.ts:66 evaluateDecision`.
- Newer code covering part: `campaign-week-unfunded-donor.test.ts` exists (a test only); commit 3de58a15e "A66 consume recorded fundraiser receipts and campaign operating bills" is the current state described above.

## Build steps (each is one PR)

1. **Add a helper after filing.** Extract `campaigns.ts:798-826` into `addCampaignHelper(world, {campaignId, personId, role: "volunteer" | "manager", pay})` and have `fileCampaign` call it. Manager role = paid work relationship; pay is a resource flow from the committee treasury through `payRecordedCampaignOperatingBill`. Files: `campaigns.ts` (new file `campaign-helpers.ts` is fine for the function; `fileCampaign` imports it). Must NOT: a second staff list; a manager the treasury cannot pay.
2. **Asking someone to help.** `askToHelp(world, {campaignId, personId})` through `evaluateDecision` (help / decline) from the person's `viewOfOfficial` of the candidate, kinship or warmth, free hours from the work schedule, and traits. Writes an event; on yes calls `addCampaignHelper`. Offered as a played choice in Session 4's scenes and as a campaign-screen list of people you know. Helper hours feed the reach function used by b01. Must NOT: fixed share who say yes. Reuse `supportRequestDecision` if its inputs fit; otherwise extend it, not copy.
3. **Hiring a manager.** Candidates: people the player knows, or whom the party chapter organizer knows, whose history includes campaign work (`service:campaign-*`, days counted as `surveyWorkDays` does). Offer only when the treasury covers salary through election day. Acceptance through `evaluateDecision`. Once hired, the manager proposes the weekly plan in `projectCampaignWeek`; plan quality reads their experience and traits. Must NOT: pick a manager from an authored list.
4. **Donors are people you know.** If Q1 part 3 has landed, reuse `CampaignAsk` and `assessCampaignContribution`. If not, build them here exactly as that brief specifies: `{id, candidateId, residentId, askedOn, amountMinorUnits, outcome gave|declined|deferred, reasonBeliefId}`; gift gated by recorded means, latest view, and the state limit; amount through `evaluateDecision` with `randomness: "none"`. CHANGE from the Q1 draft: no pack means an estimated limit from similar states, never a refusal and never zero (owner rule). Ask list: `peopleKnownTo`, campaign contacts, chapter members. A few asks played; the fundraising routine block works the rest in a stable order. Replaces: the `raisedAmount` aggregate and every Kentucky-named function.
5. **Costs priced, not targeted.** Fill `UNRESEARCHED_OPERATING_COSTS` with unit prices (yard sign, palm card, postage per piece, print ad, filing fee from b01). Spending = units times the place's own counts (households, registered voters from the world). Rename the constant (it is no longer unresearched) and migrate its readers in the same PR. Must NOT: a budget table by office title.
6. **Player view.** Campaign screen shows treasury, who gave, who helps, what was bought, and one line "races like this here usually spend about $X" computed from the game's own recorded spending in similar-size places, and from the research range only until the world has its own. Reuse the existing campaign screen.

## Must not build

- Aggregate donor-pool money, a raise-per-hour rate, or any fixed share of people who give.
- A budget target or cost table keyed by office title.
- A second staff system beside work relationships.
- Authored donor or recruiting dialogue.
- More Kentucky-named functions or any one-state rule.
- Ads, debates, speeches (other bank items; Session 22 owns campaign scenes).
- New screens the owner has not approved.

## Research tables

Existing, in the repo: `docs/research/92M-campaign-finance-ethics-lobbying.json` has 51 jurisdictions (`jurisdictions["us-al"]` etc.), each with `rules.contribution_limits` as prose with statute (for example Alabama: individuals unlimited, cash capped at $100; Alaska: unlimited under Thompson v. Hebdon, a $2,000 per cycle measure pending). It is prose, covers states only, and gives no local-office limits. The compile step must turn it into numbers (or an explicit "no limit" claim) per state; local limits not read take the state's own figure for the same election, else the median of read states. Spending evidence in `campaign-evidence.json`: MA 2022 state House average $32,665, state Senate $84,782; NYC council 2025 program limit $228,000 for a primary; Brookings school-board survey (under 2,500 students: 65.6% spent under $100; 15,000+ students: 54.4% spent $5,000+); Pipeline Fund 2024: 58% of state and local candidates had no paid staff, 15% had one.

New, one web search (campaign manager pay), from current job postings and a pay summary:

| Race                       | Pay                                                | Source                                                            |
| -------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| State legislative campaign | $3,000 to $5,500 a month over a 6 to 9 month cycle | jobs.arena.run and institutedata.com postings; climbtheladder.com |
| NYC city council           | $5,000 to $5,500 a month                           | jobs.arena.run NYC council posting                                |
| Austin city council        | $4,000 to $5,000 a month                           | jobs.arena.run Austin council posting                             |
| Overall range              | $46,000 to $91,500 a year                          | climbtheladder.com                                                |

Sizing rule for places with no posting: take the salary of the nearest read place by electorate size (registered voters), marked estimated; paid-staff presence in a small town races is the exception (58% have none), so below a small electorate size the offer does not appear because the treasury cannot cover it. Unit prices for signs, palm cards and print ads were NOT found in the repo; Codex must make ONE search (10 minutes) for yard sign, palm card and local print ad prices, put the table in `docs/research/` with sources, and otherwise estimate from the postage figure and mark estimated.

## Done when

New game in a random small town: file; treasury is zero plus own money; ask three people you know (one played) and see named gifts or refusals with reasons; recruit a sibling (yes) and a friend (no); buy signs at the unit price; no manager is offered. Second random large city: same steps, same unit prices, larger total because the place is larger; once the treasury covers a salary a manager with campaign history is offered, hired, and proposes the next week's plan.
Tests: `campaign-helpers.test.ts` (same world same answers; helper hours raise reach; manager refused when unaffordable), `campaign-donors.test.ts` (a supporter with means gives at or under the limit; an opposer declines; a place with no pack uses an estimated limit), `campaign-operating-costs.test.ts` (cost scales with household count, unit prices unchanged).

## Proof to post

Under `docs/codex/evidence/b02-money-helpers/`: screenshots of the played ask, the donor list with reasons, the helper list, the purchase screen, the manager offer and the manager's plan. Printed lines: each ask (person, means, view, limit, gift or refusal), the unit price table, small-town and large-city totals side by side.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: none. Open items, each with its switch:

- Unit prices (sign, palm card, print ad) until the one search lands: a data row table `campaign-unit-prices.json` with `estimated: true` rows derived from the postage figure; swapping in researched rows changes data only.
- Manager salary by electorate size: a data row table keyed by registered-voter band; the offer test reads only that table.
- Whether Q1 part 3 has landed: one function `assessCampaignContribution`; if absent build it here, and the Q1 team deletes its copy at merge (log in docket).
