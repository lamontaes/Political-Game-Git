---
id: world-needs-world-98
title: "Needs from other sessions listed in world.md (line 98): 30 lines"
area: world
kind: wiring
priority: 2
status: done
claimed-by: claude/world-needs-world-98
pr: #4543
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/world.md "Needs from other sessions" (line 98)'
claimed-at: 2026-10-16T02:27:28.703Z
---

**What.** This list holds 30 requests the world session made of the core, government, people and play sessions. The asking sessions are gone, so each is a wiring job. The ones a player would notice are job offers the play screen cannot answer, small towns' treasuries that cannot pay their officials, households that never move into new homes, counted workers who never die or leave, and the opening and year speed. As of 2026-10-15 several lines are resolved in stopgaps.json. Verify each against main first and split any large line into its own pool item.

Lines (as of 2026-10-15, from the status file):

- **OPUS-PLAY: an answer for job offers on the play screen.** Employers now offer the player's character a job instead of hiring them. The screen should list `jobOffersFor(api, playerId)` with accept and decline controls (`acceptJobOffer`, `declineJobOffer`). Until then an offer stops the clock, cannot be answered, and
- **OPUS-GOV: small towns' treasuries can't pay their officials (#4234).** Brookford, North Carolina's treasury held $93 at year's end against a finance director at $270 a day, and a Mississippi town's held $0 to $67. Those officials go unpaid and are the first evicted.
- **OPUS-CORE: the played-world check is red on `main` (#4234 comment).** Staff hiring fills in two people who carry the same counted household id, 11 months apart, and the fill-in cash transfer id is reused. Also, the world build fails in Polebridge, Montana (no resident aged 17).
- **OPUS-PEOPLE: no journal line for a person's own eviction.** The director records the moment, but the journal bank has no wording for `event:housing.eviction`. The press engine also throws `Invalid meeting endpoints` in one world (seed in #4234).
- **OPUS-CORE: counted workers never die or move away.** With the renewal engine, a Hawaii town's 109 deaths and 338 departing households in three months included nobody with a job, and none over the year (seed `ca545ed9…`). Who dies or leaves (`births-counted.ts`) leans so hard on work that working people never go. Jo
- **OPUS-CORE / CTO, speed after #4067 (trait-based job choices in `jobs.ts`):** three years of Absecon went from about 100 s to 136 s on the merged head while the core alone stayed at 53 s; I took back 24 s in my own code (counted hiring's per-hire scan, now 112 s). What's left is mostly `traitLean`/`kindLean` (`choic
- **OPUS-CORE: customers moving between sellers month by month (for M1-04's layoffs).** Layoffs run at 0.04% of jobs a month against JOLTS's 1.4%, because a seller's customers change only when a business opens or closes. Most real layoffs are at shrinking establishments that lose customers to rivals. Wanted: each month
- **OPUS-CORE, after merging `opus-core` and `main` (Oct 12, late evening):** (1) typecheck is red on `opus-core` itself: `src/core2/opening-public-schools.ts:22` imports `WorkPayrollCalendarInput` from `./types`, which uses it but doesn't export it (import it from `./work-pay-period`). (2) Three years of Absecon with
- **OPUS-PLAY: the custom world's economy setting (M6-04).** The new-game screen can pass `worldGameOptions({ economy: { unemploymentPct?, inflationPct?, policyRatePct? } })` (`src/core2/modules/world.ts`); anything left out stays at the real opening month.
- **OPUS-CORE: an opening crash in Valmont, Colorado (seed `0d5c879e…`, key `0880370`).** `generatedOpening(place, { twoLevel: true })` alone throws "Past fact outside recipient lifetime/opening: person_2f0fc685f53f5833:move:2021-04-17" in `buildOpeningRetirementIncome` (`opening-income.ts:325`, from your retirement-cl
- **OPUS-CORE (with GOV): retirement income for counted retirees** (a stand-in is on this branch: `addCountedRetiree` in `src/core2/residents-economy.ts`, the place's opening average). When a counted worker retires their wage flow ends and nothing replaces it, so the town's spending and then its jobs shrink about 2% a
- **OPUS-PLAY: four more panels for the bench's `worldPanels`** (`src/core2/modules/world-panels.ts`, record data only): `buildingPanel(api)` (housing stock and zoning by town, projects from start to finish, households in set-aside units), `lawCostsPanel(api)` (price rules a place's laws set, property tax assessments,
- **OPUS-CORE, speed after merging `opus-core` (Oct 12, evening):** three years of Absecon, New Jersey with the whole economy went from 46 s to 74 s. The core alone on the same world (`createLifeCore(generatedOpening(..., { twoLevel: true }))`, no economy) now takes 52 s for the three years, so most of the rise is on t
- **OPUS-CORE: households moving in.** New apartments and houses now get built, but nobody arrives to live in them, so vacancy only lowers rents (`SG-WORLD-housing-vacancy`, `SG-WORLD-housing-new-home-buyers`). Wanted: counted households arriving in a place at a pace set by its jobs and rents (I can supply the pull: `r
- **OPUS-GOV: law-reach handlers can call WORLD now.** Zoning, inclusionary, gas-hookup and farmland: `setHousingZoning`. Property tax: `registerPropertyTax((api, placeId) => ({ rate, assessmentCapShare, payeeId, source }))`. Counsel: `setRightToCounsel(api, placeId, inForce, cityTreasuryId)`. Prices: `adjustPrice`, `s
- **OPUS-GOV: one line for right to counsel.** In your law-reach group file: `registerPolicyHandler("us-policy-positions:housing-land-use.right-to-counsel-in-eviction", (api, change) => setRightToCounsel(api, change.placeId, change.inForce))` (`setRightToCounsel` from `src/core2/modules/housing.ts`, once our branches m
- **OPUS-CORE: prices should carry a business's own labor costs.** `projectBusinessPrice` (`finance-state.ts`, the business review) moves price with the national wage index only, so a local minimum-wage raise lifts payroll but not prices. Proposal: the wage factor uses the business's own pay per hour against its last r
- **OPUS-CORE: review `core2-api-v11`** (commit 7f810900 on `opus-world`): `repriceCreditFacility(id, rate, source)` accrues a credit line's interest to today at its old rate, then applies the new rate. Four small edits in `finance-types.ts`, `finance-plan.ts` (the interest planner reads the dated rate first), `finance
- **OPUS-CORE, for later:** a year in a drawn town takes about 19 minutes (95 s per 31 days, Landrum, South Carolina), so the macro year proof runs the national model on its own plus a town month. My module adds no per-day scans.
- **OPUS-GOV, for later:** appointments to the central bank board (president nominates, Senate confirms) when offices land; until then stopgap `SG-WORLD-board-appointments`.
- **OPUS-PLAY:** a bench panel for the national series and each meeting's votes; I will add the data reader on my branch.
- **OPUS-CORE: review `core2-api-v12`** (commit on `opus-world`, `src/core2/job-lifecycle.ts`): `startJob(job, commitment, calendar)` admits one hire mid-run through the existing commitment and payroll-calendar writers; `endJob(jobId, sourceId)` ends one job from calendar work, before that day's shift, the same steps `
- **OPUS-CORE: where the time goes with books (profiled).** 13 days in Landrum with the opening finance and the whole economy: 494 s of CPU, of which 198 s is `finance-plan.ts` bookkeeping (`verify` 45 s, `detach` 42 s, `directRead` 30 s, `field` 24 s, `payload` 14 s) and 167 s is garbage collection; `generated-househo
- **OPUS-CORE: the opening with business books is too slow to test on.** With `buildOpeningEconomy`, one 31-day month in Landrum, South Carolina did not finish in 30 minutes (5.9 GB). The plain opening runs 36 days in about 2 minutes but has no books, so no openings or layoffs. Jobs needs books in a world it can run.
- **OPUS-CORE: the two-level population.** The opening employs 2,167 of 6,264 working-age adults in Landrum; jobs treats only the neediest jobless adults as seekers (stopgap `SG-WORLD-jobs-opening-seekers`) until the wider population holds the rest as counts.
- **OPUS-CORE: review `core2-api-v13` and `-v14`** (`attachBusinessCredit`, `endStandingContract`, both small, in `finance-state.ts`).
- **OPUS-CORE: accounts.** Household loans, mortgages and bank deposits wait for named accounts; the bank lends only its equity until then (`SG-WORLD-credit-bank-equity-only`).
- **OPUS-GOV:** M1-laws' landlord-tenant reads will replace my eviction-steps table (`data/research/housing/eviction-steps-2026.json`), and state unemployment insurance plugs into `registerUnemploymentTerms` (`src/core2/jobs-benefits.ts`), replacing `SG-WORLD-jobs-benefits-terms`.
- **OPUS-CORE: founding seam, built on my side.** `shiftPurchaseShare` (`src/core2/residents-economy.ts`) moves a share of each residents' purchase flow paying a kind's incumbents to an equal new flow paying the entrant. The households' spending is unchanged. Please carry or replace it with the others in that file.
- **OPUS-PLAY: panels.** `src/core2/modules/world-panels.ts` has read-only readers for the bench: `regionPanel`, `jobHistory`, `turnoverPanel` (against JOLTS), `bankPanel`, `evictionPanel`, `ownerPanel`, plus `nationalPanel` in `macro.ts`. One line adds the economy: `withWorldEconomy(input)`, `worldCoreData()`, `WORLD_

**Rules.** Wire to the world: each line is done only when another engine reads what it wrote. Speed: a town year stays under two minutes and no change is more than 20 percent slower, measured on the same machine. One model, two tiers: counted workers die, move and retire under the same rule as full people. No dice: deaths and moves come from causes, never a monthly chance. Nothing waits on another session: build a registered stand-in.

**Done when.** For each line, either built and read by another engine in a one-year played world (buildBenchWorld, a drawn place from all 56, seed named), shown by record id, or verified done on main, or split into its own pool item. The tests in src/core2/jobs-player-offers.test.ts and src/core2/housing-construction.test.ts pass for the lines built. The owner plays it: accept or decline a job offer on the play screen and see a new home get a family.

**Files.** src/core2/modules/world-panels.ts, src/core2/modules/jobs.ts, src/core2/modules/housing.ts, src/core2/births-counted.ts, src/core2/residents-economy.ts, docs/archive/2026-10-23/coordination/world.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
