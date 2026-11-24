# The stand-ins, checked one by one (Nov 10, 2026)

Owner, Nov 10, about 6:19 p.m.: "Those 503 stand-ins have Fable look and I guess check those stand-ins, see which ones are code or research, etc. See which ones have already been done. Have it ask if some are too intricate, etc. Let's start looking at those stand-ins. 39 engines sound like a ton."

A stand-in is a registered stopgap: a row in a register file under `src/core2/data/stopgaps/` (or `src/director/data/stopgaps.json`) that says what the game fakes, where, and what replaces it. On Nov 10 there were 573 open: 503 in the core's 45 files and 70 in the director's. `node scripts/stopgaps-report.mjs` lists them.

This page is for a session, on any model or tool, that is given one list of stand-ins to check. It reads code and writes what it finds. It builds nothing. The lead (Fable B) reads every result, makes the calls and writes the owner's questions.

## Before you start

1. Work in a checkout of the repository. In a cloud container, run `npm install` once (never `npm ci`), and run every npm, npx or node command with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` set.
2. Read, on main: `AGENTS.md` ("Placeholders" and "Standing owner rules"), `.agents/rules/pool-item-standard.md`, and in `docs/ROADMAP.md` the Oct 10 scope calls and milestone M7.
3. Your list is under "The lists" below, by the tag you were given (T0 to T9). Make your branch from main: `git fetch origin main && git checkout -B <your branch> origin/main`.

## For every stand-in on your list, one row

Answer four things, from the code on today's main and nothing else.

**1. Still true?** Find its marker: `grep -rn "<id>" src scripts` (the marker is a comment `stopgapId: <id>` or a call `stopgap("<id>"`; the register's `file` and `line` may be out of date). Read the code around it and the code its `replacement` names. Then one of:

- **still faked:** the code does what `whatItFakes` says.
- **already replaced:** the replacement exists and is what runs. Name the function and file that replaced it, and the pull request or commit that did (`git log -S"<a name from the replacement>" --oneline -- <file>`, or the release note under `docs/release/changes/`). In the register, set `status` to `resolved`, start `replacement` with `Resolved Nov 10 (stand-in triage): <what replaced it, with the pull request or commit>. Was: ` followed by the old text, and add `resolvedAt` and `resolvedBy` the way the file's other resolved rows have them. Leave the marker in the code; say in your row that it is still there, with its file and line.
- **partly replaced:** some of it is real now. Rewrite `whatItFakes` to say only what is still faked, in plain words, and fix `file` and `line` if the marker moved.

If you cannot tell from the code, say "could not tell" and what you read. Never mark a row replaced on the strength of its own text ("now reads"): the code decides.

**2. What closes it.** One of:

- **code:** a mechanic or an engine has to be built.
- **research:** a number or a table has to be found and cited.
- **data:** a dataset has to be loaded.
- **design:** it needs a design step before anyone can build it.
- **owner call:** only the owner can say what the game should do.

**3. Its pool item.** Search `docs/pool/items` for the stand-in's id and for its subject (`grep -rl`). Then one of:

- **a live item covers it:** give the id. Live means its status is open, claimed, in-pr or blocked.
- **a new item:** write it to the item standard, in `docs/pool/items/<id>.md`: Cause `Found in code:` with the marker's file and line, a Fix a builder can build from the item alone, Time box, `model:` and `effort:`, `root:`, `lead:`, Done when (with the words "second session"), Waits on and Files. Leave out the `checked:` field: the lead adds it after reading the item, and no builder is offered it before then. One build that closes several stand-ins is one item that names them all. A research stand-in gets an item of `kind: research`.
- **none:** it is replaced, or it may stay as it is (see 4), or it waits on something named (say what).

**4. Size, and whether it may stay.** Small, medium or large. Then say whether it may stay at early access as a sourced, marked estimate: milestone M7 allows a stand-in to be "cleared or turned into a sourced or marked estimate", so a number that only needs a source is not an engine to build. A stand-in that may stay gets no build item; if it needs a source, that is a research item.

## Things already decided

- **Crime.** `SG-CORE-crime-offenders` and `SG-CORE-crime-arrests` wait for the owner's start on the one crime system (owner, Nov 10; `docs/coordination/OWNER-DECISIONS.md`). Tag any stand-in that belongs to it "waits on the crime system" and file nothing.
- **Scope calls of Oct 10** (`docs/ROADMAP.md`): courts come after early access; the press, constituent cases and corruption are basic at early access. A stand-in inside one of those may stay, and the row says which call covers it.
- **One money system, and reuse before you build (owner, Nov 10).** "Make sure it's all the same, you know, dollar system and money, or it links to or reuses code where possible, etc. It doesn't need to build everything new all the time." Money moves only through what exists: the accounts and obligations, the treasuries, withholding and the one benefit payer. So before you call a closing "code", look for the engine and the function that already own the mechanic, and name them: a stand-in's "missing engine" may only need wiring to an engine that exists. A Fix in a new item names the existing function it changes, and never adds a second payment, tax or ledger path beside one that exists.
- **Speed is part of done.** No closing plan may push a played year past two minutes. For a code closing, say in a few words how it stays cheap: monthly, by counts, or built when opened.

## A question for the owner

Write one only when closing a stand-in is intricate or costly and nothing on record answers it. Look first in `docs/coordination/OWNER-DECISIONS.md`, `docs/coordination/DECISION-REGISTER.md`, `docs/coordination/prior-rulings/` and `docs/ROADMAP.md`. Realism wins, keep it simple, and simulate, do not generate. A question says what is faked now in plain words, what closing it takes, and two to four options with the one you recommend first. Put it under "Questions for the owner" in your file. The lead decides which go to him.

## What you write

One file for each register on your list, `docs/stopgaps/triage-2026-11-10/<register>.md` (the list of missing engines is `missing-engines.md`; the two halves of `gov` are `gov-a.md` and `gov-b.md`). At the top: the counts (still faked, already replaced, partly replaced, could not tell; code, research, data, design, owner call; new items). Then one table:

| Stand-in | Still true? | What closes it | Pool item | Size | May stay at early access? | In plain words |
| -------- | ----------- | -------------- | --------- | ---- | ------------------------- | -------------- |

"In plain words" is one sentence the owner can read: what the game fakes today, with no code names. Under the table, one line of evidence for each row: the file and line you read, and for a replaced row the function and the pull request or commit. Then "Questions for the owner", or "None."

## How you hand it in

- One pull request for each register file, so each merges as it finishes. Its branch is `<your branch>-<register>` when your list has more than one register. It holds that register's page, the register edits for replaced and partly replaced rows, the new pool items, and a release note (`docs/release/changes/<an id nobody has used>.md`, `impact: none`, one plain sentence).
- Open it as a draft after your first push, and push after every ten rows. The lead marks it ready after reading it.
- The first line of its body is `Touches pool item: none (stand-in triage of <register>; nothing built).` Then the counts, and the three stand-ins you think matter most to a player, in plain words.
- Before each push: `npx vitest run src/core2/stopgaps-register.test.ts src/core2/stopgap-hits-module-calls.test.ts`, `npm run pool -- --check`, and prettier on the files you changed.
- When your list is done, send one message to the session that started you: each pull request's number and the counts.

## What you never do

- Change game code or tests. A marker stays where it is.
- Mark a row replaced without naming the code and the pull request or commit that replaced it.
- Delete a register row, or edit a register that is not on your list.
- File a build item for something that may stay, or for the crime system.
- Set `checked:` on an item, or mark your pull request ready.
- Write a line under `data/english/parts/`, or put the game's title where outsiders can see it.

## The lists

The missing engines (T0) go first: the owner flagged them. Every other list leaves those rows out.

### T0 (40 stand-ins)

- `all registers (kind missing-engine)`: SG-CORE-crime-offenders, SG-CORE-crime-arrests, SG-EFFECT-WEB-prices-rail-ridership, SG-FAMILY-marriage-not-recorded, SG-GOV-special-election-appointee, SG-GOV-views-stand-in, SG-GOV-who-runs-stand-in, SG-GOV-group-lobbyist-stand-in, SG-GOV-REACH-B-transit-fare-price, SG-GOV-REACH-B-mileage-fee-price, SG-GOV-REACH-B-broadband-bill, SG-GOV-REACH-B-medicaid-coverage, SG-GOV-REACH-B-assistance-benefits, SG-GOV-REACH-B-preschool-enrollment, SG-GOV-REACH-B-building-cost, SG-GOV-REACH-B-energy-price, SG-GOV-REACH-B-land-use, SG-GOV-REACH-B-road-condition, SG-GOV-REACH-B-tuition, SG-GOV-public-pay-floor-owner, SG-GOV-clemency-boards, SG-GOV-REACH-B-child-care-enrollment, SG-GOV-REACH-B-energy-assistance-enrollment, SG-GOV-REACH-B-ssi-eligibility, SG-LAW-held-bill-chair-reasons-unread, SG-LAWS-records-response-unread, SG-OFFICE-FED-acting-head, SG-SCHOOL-equalized-funding-budget, SG-SCHOOL-hispanic-enrollment, SG-SCHOOL-links-not-running, SG-TRAITS-partnerships-no-engine, SG-WEB-voting-graduation-cause, SG-WEB-voting-newspaper-closure, SG-WEB-snap-receipt-ledger, SG-WEB-food-insecurity-ledger, SG-WEB-poverty-licensing-no-engine, SG-WORLD-staff-husk-work, SG-WORLD-staff-seat-applicant, SG-WORLD-business-premises-property-tax, SG-DIRECTOR-speech-occasion

### T1 (54 stand-ins)

- `src/core2/data/stopgaps/gov.json`: SG-GOV-start-law-carried-back, SG-GOV-term-end-estimate, SG-GOV-campaign-pollster-seller, SG-GOV-campaign-mail-seller, SG-GOV-campaign-venue-seller, SG-GOV-rival-donor-meeting, SG-GOV-committee-structure, SG-GOV-measure-groups-stand-in, SG-GOV-recall-signature-groups, SG-GOV-group-endorsement-stance, SG-GOV-world-race-lean, SG-GOV-REACH-A-leave-claims, SG-GOV-REACH-A-union-dues, SG-GOV-REACH-A-cannabis-market, SG-GOV-REACH-A-consumer-credit, SG-GOV-REACH-A-housing-supply, SG-GOV-REACH-A-affordable-units, SG-GOV-REACH-A-rent-contracts, SG-GOV-REACH-A-eviction-cases, SG-GOV-REACH-A-convictions, SG-GOV-REACH-A-redistricting, SG-GOV-REACH-A-election-cost-estimates, SG-GOV-REACH-B-voucher-payment, SG-GOV-REACH-B-property-tax-bills, SG-GOV-REACH-B-retail-price, SG-GOV-REACH-B-business-cost, SG-GOV-polling-place-kind, SG-GOV-REACH-B-park-use, SG-GOV-delegate-race-size, SG-GOV-filing-deadline-estimate, SG-GOV-filing-fallbacks, SG-GOV-special-election-timing, SG-GOV-ballot-order-estimates, SG-GOV-executive-powers-research, SG-GOV-outside-revenue-monthly, SG-GOV-outside-revenue-base-national, SG-GOV-service-charges-by-living-cost, SG-GOV-township-law-level, SG-GOV-local-executive-proposal, SG-GOV-justice-weights, SG-GOV-justice-prosecutor-stand-in, SG-GOV-justice-bribery-grade, SG-GOV-justice-forfeiture-by-place, SG-GOV-justice-player-choices, SG-GOV-bound-employer-cost-estimate, SG-GOV-recall-bars-national, SG-GOV-recall-bars-calendar-months, SG-GOV-recall-bars-term-fraction, SG-GOV-local-bill-numbering, SG-GOV-committee-names-national, SG-GOV-REACH-A-police-oversight, SG-GOV-REACH-A-discrimination, SG-GOV-REACH-A-abortion, SG-GOV-REACH-A-age-verification

### T2 (55 stand-ins)

- `src/core2/data/stopgaps/gov.json`: SG-GOV-REACH-A-facial-recognition, SG-GOV-REACH-A-data-privacy, SG-GOV-municipal-body-name, SG-GOV-dual-office-law, SG-GOV-policy-power-unresolved, SG-GOV-policy-power-conditions, SG-GOV-federal-proposal-coverage, SG-GOV-REACH-B-flat-tax-replacement, SG-GOV-ward-map, SG-GOV-ward-residency, SG-GOV-empty-race-law, SG-GOV-wide-resident-pool, SG-GOV-territory-legislature-districts, SG-GOV-first-race-no-local-office, SG-GOV-territory-budget-mix, SG-GOV-campaign-walk-order, SG-GOV-fee-level-by-bill, SG-GOV-recall-counted-exposure, SG-GOV-officer-stipend-hours, SG-GOV-carry-ask-no-screen, SG-GOV-rent-help-population-share, SG-GOV-contract-conflict-named-members, SG-GOV-unheld-filler-party, SG-GOV-petition-count-estimated, SG-GOV-petition-town-share, SG-GOV-territory-legislature-race, SG-GOV-outside-nonpartisan-race, SG-GOV-outside-ticket-raced-alone, SG-GOV-outside-seat-party-unread, SG-GOV-outside-legislators-national-pool, SG-GOV-outside-seat-records-unfolded, SG-GOV-threat-from-circle, SG-GOV-stepped-up-unread, SG-GOV-town-hall-room-full-people, SG-GOV-outside-donor-month-income, SG-GOV-body-lawyer-unrecorded, SG-GOV-platform-support-true-share, SG-GOV-platform-slope-c1-out-of-band, SG-GOV-budget-line-stance-lean-only, SG-GOV-platform-record-term-left-out, SG-GOV-platform-emphasis-lead-only, SG-GOV-counted-lean-spread, SG-GOV-REACH-B-medicaid-federal-leg, SG-GOV-named-district-story, SG-GOV-petition-electorate-cap, SG-GOV-home-local-district, SG-GOV-later-chamber-same-day, SG-GOV-player-favor-asked, SG-GOV-outside-session-result-only, SG-GOV-outside-officials-counted, SG-GOV-property-tax-aggregate-calibration, SG-GOV-discharge-no-wait, SG-GOV-reserve-sweep, SG-GOV-spending-vote-state-county, SG-GOV-territory-municipal-mix

### T3 (69 stand-ins)

- `src/director/data/stopgaps.json`: SG-P13-param-directorMomentFloor, SG-P13-param-directorInterruptImpact, SG-P13-param-directorScaleHealth, SG-P13-param-directorWeightTieSociability, SG-P13-param-directorWeightMoneyRisk, SG-P13-param-directorRenewedFading, SG-P13-param-directorTies, SG-P13-appraisal-recompute, SG-P13-tie-day-order, SG-P13-kept-fact-producers, SG-P13-param-directorAnniversaryHalfDays, SG-P13-past-fact-estimates, SG-P15-memory-forgetting, SG-PEOPLE-address-register, SG-WORDS-param-directorTalkRecentDays, SG-WORDS-param-directorTalkSeenLittleDays, SG-WORDS-param-directorTalkAddressImpact, SG-WORDS-param-journalRaceCloseMargin, SG-WORDS-param-journalRaceWideMargin, SG-DIRECTOR-circumstance-weights, SG-WORDS-family-limit-unread, SG-WORDS-favor-promise-keeps-unread, SG-WORDS-recall-promise-record, SG-WORDS-eviction-moment-at-fill-in, SG-WORDS-swearing-in-no-court, SG-WORDS-swearing-in-address-in-scene, SG-WORDS-filing-counter-prompts, SG-WORDS-term-read-warmup, SG-WORDS-public-action-counted-share, SG-WORDS-action-confront-town-hall-lines, SG-LIVES-director-kin-contact-impact, SG-WORDS-lobby-remembers-writeback, SG-STORY-arc-variant-weights, SG-WORDS-mentor-is-officeholder, SG-WORDS-bribe-accuser-anyone-close, SG-WORDS-address-no-reader, SG-WORDS-hearing-no-reader, SG-WORDS-legislation-no-reader, SG-WORDS-minutes-no-reader, SG-WORDS-notice-no-reader, SG-WORDS-param-directorTalkViewImpact, SG-WORDS-param-directorTalkViewTraitWeight, SG-WORDS-param-directorTalkSmallTalkWeight, SG-WORDS-story-read-talk-moves-nothing, SG-WORDS-moving-goodbye-reason-rows, SG-WORDS-notice-shortfall-bands, SG-STORY-home-damaged-cast, SG-WORDS-scene-arrival-time, SG-WORDS-address-kind-policy-pull, SG-WORDS-homecoming-stay-unread, SG-WORDS-prison-visit-limits-fixed, SG-WORDS-prison-visit-promise-unread, SG-WORDS-visit-ill-no-purpose, SG-WORDS-meeting-no-club-records, SG-WORDS-meeting-promise-unread, SG-WORDS-friend-ask-plan-unrecorded, SG-WORDS-reunion-ask-unrecorded, SG-WORDS-letter-ask-unrecorded, SG-WORDS-reunion-letter-promise-unread, SG-WORDS-celebration-ask-unrecorded, SG-WORDS-gathering-ask-unrecorded, SG-WORDS-celebration-gathering-promise-unread, SG-WORDS-rescue-ask-unrecorded, SG-WORDS-rescue-promise-unread, SG-WORDS-apology-promise-unread, SG-WORDS-accusation-promise-unread, SG-WORDS-new-baby-ask-unrecorded, SG-WORDS-journal-story-no-helper, SG-STORY-constituent-help-rent-and-care-have-no-case

### T4 (50 stand-ins)

- `src/core2/data/stopgaps/world.json`: SG-WORLD-salem-county-sales-rate, SG-WORLD-housing-fill-in-arrears, SG-WORLD-regional-territory-estimate, SG-WORLD-housing-landlord, SG-WORLD-housing-eviction-steps, SG-WORLD-business-opening-owners, SG-WORLD-housing-vacancy, SG-WORLD-jobs-quit-rate-uncalibrated, SG-WORLD-counted-owner-pulls, SG-WORLD-housing-counted-rent, SG-WORLD-housing-mortgage-history, SG-WORLD-housing-price-index, SG-WORLD-credit-island-deposits, SG-WORLD-housing-island-areas, SG-WORLD-business-union-members, SG-WORLD-credit-minimum-loan, SG-WORLD-property-tax-monthly, SG-WORLD-business-compliance-cost, SG-WORLD-prices-household-shares, SG-WORLD-housing-new-home-buyers, SG-WORLD-withholding-residence-law, SG-WORLD-withholding-local-base, SG-WORLD-withholding-nonresident-local, SG-WORLD-housing-shelter-beds-state-rate, SG-WORLD-housing-shelter-territory, SG-WORLD-housing-foreclosure-steps, SG-WORLD-new-rental-move-coverage, SG-WORLD-deposit-wallet-buffer, SG-WORLD-opening-mortgage-funding, SG-WORLD-board-hawk-side, SG-WORLD-board-career-qualification, SG-WORLD-department-government, SG-WORLD-coarse-place-no-payroll, SG-WORLD-jobs-schooling-pay-share, SG-WORLD-housing-lease-anniversary, SG-WORLD-housing-eviction-day-counting, SG-WORLD-weight-release-jobless-not-seeking, SG-WORLD-fill-in-fractional-sole-job, SG-WORLD-pr-counted-renter-income-third, SG-WORLD-jobs-public-pay-growth, SG-WORLD-roster-no-2024-vote, SG-WORLD-small-dollar-one-lender, SG-WORLD-small-dollar-lender-keeps-interest, SG-WORLD-small-dollar-one-open-loan, SG-WORLD-small-dollar-no-storefront-town, SG-WORLD-counted-evicted-push-rate, SG-WORLD-counted-eviction-kin-notice, SG-WORLD-government-opening-fund-balance, SG-WORLD-grievance-ownerless-landlord, SG-WORLD-grievance-no-fold

### T5 (52 stand-ins)

- `src/core2/data/stopgaps/p8.json`: SG-P8-household-shared-time-contact, SG-P8-param-needWeight, SG-P8-param-goalWeight, SG-P8-param-driveWeight, SG-P8-param-traitWeight, SG-P8-param-emotionWeight, SG-P8-param-effortWeight, SG-P8-param-restEffect, SG-P8-param-careEffect, SG-P8-param-companyHorizonDays, SG-P8-param-organizationReserveMonths, SG-P8-param-appraisalRelationshipWeight, SG-P8-param-appraisalDistressTraitWeight, SG-P8-param-appraisalBroodingTraitWeight, SG-P8-emotion-model, SG-P8-life-utility, SG-P8-civic-progress, SG-P8-deep-past, SG-P8-civic-inputs, SG-P8-authored-job-mix, SG-P8-opening-peer-network, SG-P8-opening-employment, SG-P8-resident-employment-proxy, SG-P8-work-schedule-data, SG-P8-attendance-choice, SG-P8-work-pay-terms, SG-P8-work-time-reserve, SG-P8-business-books-priors, SG-P8-business-books-classification, SG-P8-business-books-dynamics, SG-P8-business-books-credit-policy, SG-P8-finance-settlement-policy, SG-P8-opening-finance-bindings, SG-P8-opening-finance-cadence, SG-P8-finance-sales-receipt-budgets, SG-P8-opening-retirement-income, SG-P8-param-openingRetirementClaimTraitPullYears, SG-P8-param-openingRetirementCoveredTraitPull, SG-P8-opening-retirement-funding, SG-P8-family-network-coverage, SG-P8-opening-customer-generation, SG-P8-opening-customer-public-procurement, SG-P8-public-payroll-due-flow, SG-P8-outside-product-demand-crosswalk, SG-P8-customer-due-calendar-renewal, SG-P8-opening-private-cash-buffer, SG-P8-opening-private-cash-buffer-spread, SG-P8-opening-unsupported-owner-funding, SG-P8-opening-public-owner-history, SG-P8-opening-public-owner-coverage, SG-P8-opening-employer-pay-calendar, SG-P8-farm-sector

### T6 (52 stand-ins)

- `src/core2/data/stopgaps/web.json`: SG-WEB-outcome-drift, SG-WEB-knowing-rent-reader, SG-WEB-moves-full-tax-pull, SG-WEB-housing-links-unsized, SG-WEB-disaster-severity-damage-proxy, SG-WEB-voting-relief-approval, SG-WEB-crime-justice-links-unread, SG-WEB-unread-housing-ac-share, SG-WEB-unread-gov-nondisaster-transfers, SG-WEB-unread-finance-medical-debt-in-collections, SG-WEB-unread-finance-past-due-debt, SG-WEB-unread-gov-borrowing-cost, SG-WEB-unread-press-media-trust, SG-WEB-unread-disaster-damage, SG-WEB-unread-env-litter, SG-WEB-unread-disaster-flood-damage, SG-WEB-unread-farmland-value-per-acre, SG-WEB-unread-rail-intercity-ridership, SG-WEB-uninsured-share-misses-medicaid-coverage, SG-WEB-rent-burden-steeper-past-32
- `src/core2/data/stopgaps/p15.json`: SG-P15-params-uncalibrated, SG-P15-kin-generation, SG-P15-kin-living-cost-region, SG-P15-personality-mapping, SG-P15-closeness-model, SG-P15-partnership-model, SG-P15-distance-by-place, SG-P15-coworker-groups, SG-P15-grief-line, SG-P15-free-block-plan, SG-P15-encounters, SG-P15-kin-light-past, SG-P15-views-first-version, SG-P15-candidacy-weights, SG-P15-news-habits, SG-P15-speech-reception, SG-P15-corruption-weights, SG-P15-bribe-falling-out-rare, SG-P15-opening-profile, SG-P15-moves-weights, SG-P15-moves-owners-stay, SG-P15-party-ask-after-player
- `src/core2/data/stopgaps/effect.json`: SG-EFFECT-WEB-prices-gov-borrowing, SG-EFFECT-WEB-prices-roads-condition, SG-EFFECT-WEB-prices-transit-service, SG-EFFECT-WEB-prices-past-due-debt, SG-EFFECT-WEB-prices-nondisaster-transfers
- `src/core2/data/stopgaps/ew.json`: SG-EW-HEALTH-death-cause, SG-EW-HEALTH-condition-record, SG-EW-HEALTH-unsized-links, SG-EW-HEALTH-person-level, SG-EW-HEALTH-marriage-equality-cause

### T7 (66 stand-ins)

- `src/core2/data/stopgaps/core.json`: SG-CORE-residents-cadence, SG-CORE-voluntary-closure-final-pay, SG-CORE-retirement-claims-in-play, SG-CORE-private-tuition-average, SG-CORE-school-days, SG-CORE-disasters-from-records, SG-CORE-cause-group-ads-only, SG-CORE-counted-giving-stand-in, SG-CORE-past-undated-law-age, SG-CORE-past-named-only, SG-CORE-past-counted-parents-deaths, SG-CORE-past-territory-ballots, SG-CORE-estate-cash-only, SG-CORE-counted-person-views, SG-CORE-counted-unkeyed-money, SG-CORE-district-placement, SG-CORE-outside-governments, SG-CORE-crime-exposure-marginals, SG-CORE-outside-share-service-level
- `src/core2/data/stopgaps/gq.json`: SG-GQ-ages-by-type, SG-GQ-room-size, SG-GQ-no-turnover, SG-GQ-census-day-2020, SG-GQ-counted-prisoners-vote, SG-GQ-institution-costs, SG-GQ-military-pay, SG-GQ-institution-owner, SG-GQ-means-tests-poverty, SG-GQ-crime-exposure, SG-GQ-campaign-doors, SG-GQ-juvenile-school, SG-GQ-home-backdrop, SG-GQ-place-earnings-blend, SG-GQ-county-employment-denominator, SG-GQ-waiting-list-order
- `src/core2/data/stopgaps/people.json`: SG-PEOPLE-press-bureau-shortfall, SG-PEOPLE-press-outlet-other-costs, SG-PEOPLE-press-staff-households, SG-PEOPLE-press-favors-and-leaks, SG-PEOPLE-press-endorsements, SG-PEOPLE-cause-holder-weekly-contacts, SG-PEOPLE-counted-readers-stories, SG-PEOPLE-counted-victims-lived-crime, SG-PEOPLE-unplanned-calibration, SG-PEOPLE-counted-opening-exposure, SG-PEOPLE-press-conflict-beat, SG-PEOPLE-origin-skin-tones, SG-PEOPLE-life-record-cap, SG-PEOPLE-whole-past-first-month-economy, SG-PEOPLE-role-people-have-no-past, SG-PEOPLE-played-jobs-read-at-open
- `src/core2/data/stopgaps/lives.json`: SG-LIVES-elsewhere-not-into-town, SG-LIVES-work-no-employer, SG-LIVES-work-out-of-labor-force, SG-LIVES-partner-same-sex, SG-LIVES-partner-cohabiting, SG-LIVES-partner-stage-lengths, SG-LIVES-partner-counted, SG-LIVES-kin-contact-traits, SG-LIVES-mentorship-model, SG-LIVES-rescue-acute, SG-LIVES-quarrel-model, SG-LIVES-abroad-arrivals-no-pull, SG-LIVES-origin-state-shares, SG-LIVES-county-sample-employers, SG-LIVES-civic-roles-not-recorded

### T8 (71 stand-ins)

- `src/core2/data/stopgaps/nation.json`: SG-NATION-outside-budget-lines, SG-NATION-disaster-damage-from-causes, SG-NATION-hazard-replay, SG-NATION-outside-measure-news-unworded, SG-NATION-climate-sizes-national, SG-NATION-hazard-heat-drought-history, SG-NATION-climate-world-path, SG-NATION-vulnerability-proxy, SG-NATION-federal-axis-proxy, SG-NATION-country-tier-working-values, SG-NATION-regions-read-their-state, SG-NATION-country-tier-federal-spending, SG-NATION-country-tier-state-budgets, SG-NATION-country-tier-outside-world, SG-NATION-country-tier-moves-twice
- `src/core2/data/stopgaps/play.json`: SG-PLAY-act-control-names, SG-PLAY-desktop-update-dialog-text, SG-PLAY-town-count-estimate, SG-PLAY-day-start-minute, SG-PLAY-room-condition-rule, SG-PLAY-plate-overflow-spots, SG-PLAY-region-states, SG-PLAY-people-pack-six, SG-PLAY-people-pack-v4-pose-gaps, SG-PLAY-people-everyday-falls-back-to-work, SG-PLAY-government-judicial-no-judges, SG-PLAY-home-plated-room-first, SG-PLAY-campaign-acts-buttons, SG-PLAY-office-hours-assumed, SG-PLAY-trip-time-average
- `src/core2/data/stopgaps/labor.json`: SG-LABOR-counted-partner-proxy, SG-LABOR-no-legal-status, SG-LABOR-person-exposure, SG-LABOR-unsized-links, SG-LABOR-pretrial-employment, SG-LABOR-participation-scale, SG-LABOR-regional-job-town-roles, SG-LABOR-turnover-fixed-rate, SG-LABOR-find-age-estimated, SG-LABOR-opening-band-ratios-town-mix, SG-LABOR-vacancy-size-uniform, SG-LABOR-ban-the-box-proof-fixture-convictions, SG-LABOR-record-bias-public-only
- `src/core2/data/stopgaps/school.json`: SG-SCHOOL-college-decided-at-graduation, SG-SCHOOL-college-stock-ledger, SG-SCHOOL-switch-window, SG-SCHOOL-counted-attendance, SG-SCHOOL-spending-line-for-per-pupil, SG-SCHOOL-honors-no-history, SG-SCHOOL-honors-athletic-ability, SG-SCHOOL-honors-one-signing-day, SG-SCHOOL-honors-every-district-holds-a-bee, SG-SCHOOL-class-size-cohort
- `src/core2/data/stopgaps/laws.json`: SG-LAWS-state-party-loyalty-target, SG-LAWS-grocery-exemption-local-base, SG-LAWS-lobbying-period-unspecified, SG-LAWS-neighbor-law-starting, SG-LAWS-federal-position-no-reader, SG-LAWS-local-line-filing-threshold, SG-LAWS-disaster-share-size, SG-LAWS-debt-limit-binding, SG-LAWS-retail-choice-price, SG-LAWS-ui-base-period-last-pay
- `src/core2/data/stopgaps/law.json`: SG-LAW-outcome-link-unresearched, SG-LAW-justice-youth-firearm-harm, SG-LAW-justice-enforcement-outcome-readers, SG-LAW-justice-named-offender-acts, SG-LAW-estates-counted-people, SG-LAW-death-tax-no-schedule, SG-LAW-government-heir-exempt-assumed, SG-LAW-age-check-teen-distress

### T9 (64 stand-ins)

- `src/core2/data/stopgaps/bench.json`: SG-BENCH-money-recent-months, SG-BENCH-money-spending-reasons
- `src/core2/data/stopgaps/campaign.json`: SG-CAMPAIGN-offer-full-people-only, SG-CAMPAIGN-manager-changes-nothing-yet, SG-CAMPAIGN-volunteer-shift-no-scene
- `src/core2/data/stopgaps/executive.json`: SG-EXECUTIVE-administrator-appoints
- `src/core2/data/stopgaps/family.json`: SG-FAMILY-child-benefit-not-paid, SG-FAMILY-birth-bonus-not-paid
- `src/core2/data/stopgaps/health.json`: SG-HEALTH-youth-cannabis-record-unread, SG-HEALTH-own-records-counted, SG-HEALTH-medical-bill-shape, SG-HEALTH-medical-debt-collections, SG-HEALTH-medical-owed-fill-in, SG-HEALTH-results-mode-opening-gap
- `src/core2/data/stopgaps/hist.json`: SG-HIST-past-work-day-one-town, SG-HIST-moves-life-stage-only, SG-HIST-school-elsewhere-unnamed, SG-HIST-counted-couples-from-household
- `src/core2/data/stopgaps/jobs.json`: SG-JOBS-corporate-office-as-service-seller
- `src/core2/data/stopgaps/justice.json`: SG-JUSTICE-counted-custody-pay
- `src/core2/data/stopgaps/legislature.json`: SG-LEGISLATURE-phase-in-percent-a-year, SG-LEGISLATURE-dated-budget-line-amended-on-enactment, SG-LEGISLATURE-cosponsors-player-bills, SG-LEGISLATURE-study-committee-terms
- `src/core2/data/stopgaps/living.json`: SG-LIVING-keep-back-gross-pay
- `src/core2/data/stopgaps/loc.json`: SG-LOC-residence-rooms
- `src/core2/data/stopgaps/m1.json`: SG-M1-births-circumstances, SG-M1-opening-pregnancies
- `src/core2/data/stopgaps/meetings.json`: SG-MEETINGS-debate-no-moderator
- `src/core2/data/stopgaps/office.json`: SG-OFFICE-FED-trip-residents, SG-OFFICE-FED-pardons, SG-OFFICE-public-project-finish-date
- `src/core2/data/stopgaps/officials.json`: SG-OFFICIALS-unrecorded-party
- `src/core2/data/stopgaps/p10.json`: SG-P10-params-uncalibrated, SG-P10-response-model, SG-P10-perception-model, SG-P10-drive-acts, SG-P10-health-minimal-port, SG-P10-event-severity, SG-P10-resilience-scale
- `src/core2/data/stopgaps/pool.json`: SG-POOL-party-officers-local
- `src/core2/data/stopgaps/pw8.json`: SG-PW8-partnership-start
- `src/core2/data/stopgaps/screens.json`: SG-SCREENS-candidate-rally, SG-SCREENS-filing-platform-from-views, SG-SCREENS-counter-six-replies, SG-SCREENS-office-hover-prose, SG-SCREENS-metrics-no-prior-year
- `src/core2/data/stopgaps/speed.json`: SG-SPEED-fast-forward-campaigns, SG-SPEED-hearer-groups, SG-SPEED-results-mode-daily-work, SG-SPEED-results-mode-work-attendance
- `src/core2/data/stopgaps/state.json`: SG-STATE-line-item-veto-engine, SG-STATE-dev-seat-player
- `src/core2/data/stopgaps/traits.json`: SG-TRAITS-household-distance-estimate, SG-TRAITS-director-claims-reader, SG-TRAITS-counted-health-no-trait, SG-TRAITS-counted-no-maturity, SG-TRAITS-press-local-misconduct-reach, SG-TRAITS-counted-hardship-stress, SG-TRAITS-file-claim-circumstances-tie
- `src/core2/data/stopgaps/wire.json`: SG-WIRE-PEOPLE-SCHOOLMATES
- `src/core2/data/stopgaps/words.json`: SG-WORDS-nation-no-moved-from-tie, SG-WORDS-milestone-birthday-full-people, SG-WORDS-letters-counted-readers
