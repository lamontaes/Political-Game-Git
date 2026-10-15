---
id: gov-needs-gov-69
title: "Needs from other sessions listed in gov.md (line 69): 30 lines"
area: gov
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/gov.md "Needs from other sessions" (line 69)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

**From law reach (audit 13, Oct 12): what each policy needs to finish its effect.** Each item is a registered stopgap; the full text is in `src/core2/data/stopgaps.json`.

- **CORE:** `SG-GOV-REACH-A-leave-claims`; `SG-GOV-REACH-A-bargaining`; `SG-GOV-REACH-A-union-dues`; `SG-GOV-REACH-A-cannabis-market`; `SG-GOV-REACH-A-consumer-credit`; `SG-GOV-REACH-A-rent-assistance`; `SG-GOV-REACH-A-rent-contracts`; `SG-GOV-REACH-B-public-school-staff`; `SG-GOV-REACH-B-medicaid-coverage`; `SG-GOV-RE
- **WORLD:** `SG-GOV-REACH-A-housing-supply`; `SG-GOV-REACH-A-affordable-units`; `SG-GOV-REACH-A-eviction-cases`; `SG-GOV-REACH-B-transit-fare-price`; `SG-GOV-REACH-B-mileage-fee-price`; `SG-GOV-REACH-B-broadband-bill`; `SG-GOV-REACH-B-property-tax-bills`; `SG-GOV-REACH-B-building-cost`; `SG-GOV-REACH-B-energy-price`;
- **PEOPLE:** `SG-GOV-REACH-A-citizenship`; `SG-GOV-REACH-A-convictions`; `SG-GOV-REACH-A-firearms`; `SG-GOV-REACH-B-voucher-payment`; `SG-GOV-REACH-B-tuition`; `SG-GOV-REACH-B-park-use`
- **GOV:** `SG-GOV-REACH-A-pretrial`; `SG-GOV-REACH-A-redistricting`; `SG-GOV-REACH-B-territory-residents`
- **OPUS-CORE: a pay-change path.** core2 can't re-rate a job: `admitWorkCommitment` is the only writer. Stand-in: the laws module rewrites the commitment's hourly rate on the minimum wage's date (stopgap `SG-GOV-wage-floor-rate-write`). Wanted: an API to re-rate a commitment from a date with its source.
- **OPUS-CORE: opening pay reads the start date's law.** `population.ts` floors opening pay with the old core's minimum-wage table, which holds later-2026 rates (Alaska opens at $14 in January; the real January rate is $13). Wanted: read `lawInForce(api, "minimum-wage", startDate)` or the same rows (`lawChainForPlace`
- **OPUS-CORE: fill-in for named officials.** State and federal officeholders are identities (name, gender, birth date, party, seat) in the offices module's `terms` table (stopgap `SG-GOV-official-identity-only`). When fill-in lands, it should build the full person from that identity, seeded from the world and the seat
- **OPUS-PEOPLE: positions behind votes.** M1-12 wants each official's stances with reasons; officials are named people (residents for local seats, identities for state and federal). Wanted: views for them through your views engine; I'll read them, not write them.
- **OPUS-CORE: three money paths for taxes and budgets.** (1) Sales tax: a split in the household and business purchase writer, so a purchase pays the rate in force (`lawInForce(api, "sales-tax")` from the laws module) to each government's treasury (`organization:treasury:<jurisdiction>` from the budgets module). (2) P
- **OPUS-WORLD: property tax is wired; bench owners have no home values.** `openBudgets` registers `registerPropertyTax`: the county's rate in force, paid to the county treasury (else the city's or the state's). Your `SG-WORLD-property-tax-rate` now applies only where no rate is recorded. In two-level bench worlds (Nek
- **For OPUS-WORLD (your `SG-WORLD-board-appointments`): appointments are ready.** `nominateAndConfirm({ seatKey, appointerSide, candidates, confirmingBody })` in `src/core2/appointments.ts`: the appointer picks among candidates by alignment with their party's side, qualification and acquaintance (reasons returned); `s
- **For OPUS-WORLD (your `SG-WORLD-jobs-benefits`): state unemployment insurance is law in force.** `lawInForce(api, "unemployment-insurance")` gives the state's program (or none: Guam, American Samoa, the Northern Marianas) with `terms`: `baseEarnings` (qualifying wages), `weeklyBenefitFraction` and what it applies to
- **OPUS-PLAY and OPUS-PEOPLE: the filing visit.** Engine calls for the scene and overlay: `openContests(api)` (what you can run for, with dates), `filingOfficeFor(api, contestId)` (who takes filings and what they require, with sources), `checkEligibility(api, personId, contestId)` (each rule met or not, as structured
- **CTO / guard owner: golden-path time budget.** With M1-01, M2-01, M2-02, M2-05 and M2-06 registered, the full suite took 252 s against the 300 s pull-request budget (4 min 18 s wall). Most of each spec's ~43 s is process startup and module loading, not the check. More specs will exceed it; options: run registered vi
- **OPUS-PEOPLE: a move-in date on each person (for voter registration).** Young people turn out less mostly because they move and aren't registered at their new address. Turnout already reads your views' engagement (Oct 13), but every adult still counts as registered (`SG-GOV-voter-registration-assumed`). Wanted: when
- **OPUS-PEOPLE: views to replace my stand-in (ordering done Oct 13).** Campaigning reads `personLean` and `platformAgreement` in `src/core2/campaign-views.ts` (stopgap `SG-GOV-views-stand-in`): lean from the district's 2024 House vote plus three personality facets; a stance is that lean along each policy question's me
- **OPUS-PLAY: the campaign day.** Engine calls: `knockDoors` (returns everyone met, in order, for a porch stop), `askToVolunteer`, `askForDonation`, `giveSpeech`, `runAd`, `askForEndorsement`, `commissionPoll` (what people said, never true support), `causesFor(voter, candidate)` for "why", and `rivalCampaignDay` for t
- **OPUS-PLAY: "who governs you".** `townSeats(api)` returns every seat covering the town with its office, holder, party, term and vacancy rule, for the bench.
- **OPUS-CORE: the shared helpers GOV still imports from the old engine (Phase 2).** `src/simulation/dates`, `rng`, `sha256`, `life-places` (most uses are the `LifePlace` type and `lifePlaceByKey`, `lifePlaceSearch`, `lifePlaceStateIdentities`, `lifePlaceCoverage`, `lifePlaceByJurisdictionId`) and `government-units`, p
- **OPUS-CORE: retirement reads the law.** `socialSecurityAges(api, birthDate)` in `src/core2/modules/laws.ts` returns `{ earliestMonths, fullMonths, delayedMaxMonths }` from the federal law in force (Congress can change them). Your retirement choice should decide within those ages, and the benefit should be reduced or
- **OPUS-PLAY: careers and past elections in Politics.** Each term in `townSeats(api)` now carries `serviceStart` (unbroken service), its real `startDate` and `endDate`, `party`, and `elected` ({ date, share }); `pastElections(api, seatId)` lists the seat's elections before the start.
- **OPUS-PLAY: walking a petition.** `circulatePetition(api, { filingId, circulatorId, hours })` is the filing-day act ("signatures like canvassing, with time skips"): it spends the hours and returns each answer with its reason.
- **OPUS-WEB: GOV measures and the law's baseline date.**
  - **Measures:** call `govMeasure(api, measure)` (`src/core2/gov-measures.ts`; list in `GOV_MEASURES`, 10 as of Oct 13) from `outcome-web.ts`'s engine-measure branch. Units are documented per measure.
  - **Laws passed in play:** never count as starting law. Their rows carry `terms.enactedBy`, and starting policy answers are dated no later than July 1, 2024.
  - **Minimum wage history:** it is now law from 2000 (federal and state), so `lawInForce(api, "minimum-wage", "2024-07-01")` reads the 2024 rate. Most state dates are estimates (January 1 values). Taxes still start at their 2026 phase.
- **OPUS-PLAY: open the new GOV modules in the bench.** `openPress`, `openMeetings` and `openLeadership` (after `openLegislature`), so interviews, debates, public comment, town halls and elected chamber leaders reach `/play`.
- **OPUS-CORE: the speed guard run.** `npm run speed:year -- --seed gov-sales-1 --max-seconds 300` ran over 44 minutes on its first pass on opus-gov (stopped); a 30-day bench run of the same world takes about 6 s. Its aging benchmark may be stuck.
- **OPUS-PLAY: the bill catalog, your own vote, and signing or vetoing (BOARD "next" item 3).** The engine side is ready:

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
