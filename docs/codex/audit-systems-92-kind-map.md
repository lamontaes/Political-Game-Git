# All catalog laws have a proposed shared kind

The catalog’s 92 policy questions fit the approved eight consequence kinds. This map assigns a primary kind to each question and identifies cases that need additional kinds. These are design assignments for the coordinator and existing builders. They do not establish operative terms, delivered services or working handlers. Starting and enacted laws need the same resolved law identity, supported terms and actual subject records before a consequence can be saved.

## Counts and proof boundary

Measured catalog denominator: 92 unique keys, with 72 state/local and 20 federal questions. Inferred primary assignments: pay: 4 laws, tax: 8 laws, price-cost: 11 laws, coverage-eligibility: 12 laws, right-permission: 21 laws, service-delivered: 15 laws, legal-outcome: 4 laws, institution-rule: 17 laws. The eight counts sum to 92. The full machine-readable map is docs/codex/audit-systems-92-kind-map.json:1.

Measured implementation at source d9e4b8689b24470af29262d5b38affcc9dbb360a: src/simulation/enacted-law-effects.ts:245 requires an enacted history row and calls existing tax, appropriation, duty and eligibility writers at lines 253–273. This inspection establishes no implementation of the new eight-kind dispatcher. Approved design source is docs/codex/one-law-consequence-contract.md at 1e44b58863169f42b70dbd488bd3df6964751f36.

## Exact catalog assignments

| # | Canonical question key | Primary kind | Additional kinds to resolve | Catalog source |
| --- | --- | --- | --- | --- |
| 1 | us-policy-positions:fiscal.adopt-income-tax | tax | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:146 |
| 2 | us-policy-positions:fiscal.graduated-income-tax | tax | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:189 |
| 3 | us-policy-positions:fiscal.cap-property-tax-growth | tax | institution-rule | src/simulation/policy-pack-us-policy-positions.ts:227 |
| 4 | us-policy-positions:fiscal.exempt-groceries-from-sales-tax | tax | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:267 |
| 5 | us-policy-positions:fiscal.balanced-operating-budget | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:304 |
| 6 | us-policy-positions:fiscal.fund-pensions-to-schedule | institution-rule | pay | src/simulation/policy-pack-us-policy-positions.ts:342 |
| 7 | us-policy-positions:fiscal.minimum-reserve-balance | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:383 |
| 8 | us-policy-positions:government-operations.independent-redistricting | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:413 |
| 9 | us-policy-positions:government-operations.require-photo-id-to-vote | coverage-eligibility | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:457 |
| 10 | us-policy-positions:government-operations.automatic-voter-registration | coverage-eligibility | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:507 |
| 11 | us-policy-positions:government-operations.legislative-term-limits | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:557 |
| 12 | us-policy-positions:government-operations.ban-lobbying-after-office | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:598 |
| 13 | us-policy-positions:government-operations.broaden-local-authority | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:638 |
| 14 | us-policy-positions:education.equalize-school-funding | service-delivered | coverage-eligibility | src/simulation/policy-pack-us-policy-positions.ts:687 |
| 15 | us-policy-positions:education.public-funds-for-private-schooling | coverage-eligibility | service-delivered, price-cost | src/simulation/policy-pack-us-policy-positions.ts:731 |
| 16 | us-policy-positions:education.raise-teacher-minimum-salary | pay | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:785 |
| 17 | us-policy-positions:education.universal-preschool | service-delivered | coverage-eligibility | src/simulation/policy-pack-us-policy-positions.ts:825 |
| 18 | us-policy-positions:education.freeze-public-tuition | price-cost | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:874 |
| 19 | us-policy-positions:education.state-curriculum-standards | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:916 |
| 20 | us-policy-positions:health-human-services.expand-medicaid-eligibility | coverage-eligibility | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:970 |
| 21 | us-policy-positions:health-human-services.medicaid-work-requirement | coverage-eligibility | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1009 |
| 22 | us-policy-positions:health-human-services.work-requirement-for-assistance | coverage-eligibility | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1053 |
| 23 | us-policy-positions:health-human-services.fund-behavioral-health-crisis-response | service-delivered | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1099 |
| 24 | us-policy-positions:health-human-services.harm-reduction-services | service-delivered | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1137 |
| 25 | us-policy-positions:health-human-services.housing-first-homelessness | coverage-eligibility | service-delivered | src/simulation/policy-pack-us-policy-positions.ts:1176 |
| 26 | us-policy-positions:justice-public-safety.end-cash-bail | legal-outcome | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1215 |
| 27 | us-policy-positions:justice-public-safety.mandatory-minimum-sentences | legal-outcome | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1258 |
| 28 | us-policy-positions:justice-public-safety.civilian-oversight-of-police | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1303 |
| 29 | us-policy-positions:justice-public-safety.permit-to-carry-concealed | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1347 |
| 30 | us-policy-positions:justice-public-safety.raise-juvenile-court-age | legal-outcome | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1380 |
| 31 | us-policy-positions:justice-public-safety.restore-voting-after-sentence | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1420 |
| 32 | us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones | right-permission | price-cost | src/simulation/policy-pack-us-policy-positions.ts:1464 |
| 33 | us-policy-positions:housing-land-use.rent-stabilization | price-cost | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1505 |
| 34 | us-policy-positions:housing-land-use.by-right-permitting | right-permission | price-cost | src/simulation/policy-pack-us-policy-positions.ts:1539 |
| 35 | us-policy-positions:housing-land-use.inclusionary-requirement | coverage-eligibility | price-cost | src/simulation/policy-pack-us-policy-positions.ts:1577 |
| 36 | us-policy-positions:housing-land-use.preempt-local-housing-limits | right-permission | price-cost | src/simulation/policy-pack-us-policy-positions.ts:1611 |
| 37 | us-policy-positions:housing-land-use.right-to-counsel-in-eviction | coverage-eligibility | legal-outcome, service-delivered | src/simulation/policy-pack-us-policy-positions.ts:1649 |
| 38 | us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit | service-delivered | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1686 |
| 39 | us-policy-positions:transportation-infrastructure.fare-free-transit | price-cost | service-delivered | src/simulation/policy-pack-us-policy-positions.ts:1774 |
| 40 | us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours | service-delivered | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1730 |
| 41 | us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax | tax | price-cost | src/simulation/policy-pack-us-policy-positions.ts:1812 |
| 42 | us-policy-positions:transportation-infrastructure.public-broadband | service-delivered | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1856 |
| 43 | us-policy-positions:transportation-infrastructure.fix-it-first | service-delivered | institution-rule | src/simulation/policy-pack-us-policy-positions.ts:1900 |
| 44 | us-policy-positions:business-commerce.reduce-occupational-licensing | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:1940 |
| 45 | us-policy-positions:business-commerce.legalize-cannabis-sales | price-cost | tax, right-permission | src/simulation/policy-pack-us-policy-positions.ts:1974 |
| 46 | us-policy-positions:business-commerce.cap-development-incentives | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2008 |
| 47 | us-policy-positions:business-commerce.cap-consumer-loan-rates | price-cost | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2046 |
| 48 | us-policy-positions:labor-workforce.raise-minimum-wage | pay | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2076 |
| 49 | us-policy-positions:labor-workforce.local-minimum-wage-authority | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2107 |
| 50 | us-policy-positions:labor-workforce.paid-family-leave | price-cost | pay, coverage-eligibility | src/simulation/policy-pack-us-policy-positions.ts:2146 |
| 51 | us-policy-positions:labor-workforce.public-sector-collective-bargaining | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2194 |
| 52 | us-policy-positions:labor-workforce.right-to-work | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2233 |
| 53 | us-policy-positions:environment-energy.clean-electricity-standard | institution-rule | right-permission, service-delivered | src/simulation/policy-pack-us-policy-positions.ts:2277 |
| 54 | us-policy-positions:environment-energy.price-carbon | tax | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2318 |
| 55 | us-policy-positions:environment-energy.ban-new-gas-hookups | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2361 |
| 56 | us-policy-positions:environment-energy.restrict-building-in-flood-zones | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2405 |
| 57 | us-policy-positions:environment-energy.bottle-deposit | price-cost | tax | src/simulation/policy-pack-us-policy-positions.ts:2448 |
| 58 | us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2485 |
| 59 | us-policy-positions:agriculture-natural-resources.protect-farmland-from-development | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2529 |
| 60 | us-policy-positions:agriculture-natural-resources.expand-public-land-access | right-permission | service-delivered | src/simulation/policy-pack-us-policy-positions.ts:2572 |
| 61 | us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work | right-permission | pay, legal-outcome | src/simulation/policy-pack-us-policy-positions.ts:2614 |
| 62 | us-policy-positions:civil-family-community.restrict-abortion | right-permission | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2667 |
| 63 | us-policy-positions:civil-family-community.fund-public-libraries | service-delivered | institution-rule | src/simulation/policy-pack-us-policy-positions.ts:2713 |
| 64 | us-policy-positions:civil-family-community.local-control-of-library-materials | institution-rule | right-permission | src/simulation/policy-pack-us-policy-positions.ts:2756 |
| 65 | us-policy-positions:civil-family-community.dedicated-parks-funding | service-delivered | tax | src/simulation/policy-pack-us-policy-positions.ts:2805 |
| 66 | us-policy-positions:technology-privacy.consumer-data-privacy-law | institution-rule | right-permission, price-cost | src/simulation/policy-pack-us-policy-positions.ts:2853 |
| 67 | us-policy-positions:technology-privacy.restrict-government-facial-recognition | right-permission | institution-rule | src/simulation/policy-pack-us-policy-positions.ts:2892 |
| 68 | us-policy-positions:technology-privacy.age-verification-for-social-media | institution-rule | right-permission, price-cost | src/simulation/policy-pack-us-policy-positions.ts:2933 |
| 69 | us-federal-positions:budget.pay-for-a-higher-debt-limit | institution-rule | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:29 |
| 70 | us-federal-positions:tax.raise-top-income-tax-rate | tax | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:63 |
| 71 | us-federal-positions:monetary-financial.cap-consumer-loan-interest | price-cost | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:101 |
| 72 | us-federal-positions:defense.grow-defense-spending | service-delivered | price-cost | src/simulation/policy-pack-us-federal-positions.ts:144 |
| 73 | us-federal-positions:foreign-affairs.increase-foreign-aid | service-delivered | price-cost | src/simulation/policy-pack-us-federal-positions.ts:176 |
| 74 | us-federal-positions:trade.raise-tariffs | tax | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:215 |
| 75 | us-federal-positions:immigration.admit-more-immigrants | coverage-eligibility | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:248 |
| 76 | us-federal-positions:health.medicare-drug-price-negotiation | price-cost | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:291 |
| 77 | us-federal-positions:social-insurance.raise-retirement-age | coverage-eligibility | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:330 |
| 78 | us-federal-positions:education.forgive-student-loans | price-cost | coverage-eligibility | src/simulation/policy-pack-us-federal-positions.ts:369 |
| 79 | us-federal-positions:labor-commerce.raise-federal-minimum-wage | pay | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:407 |
| 80 | us-federal-positions:housing.vouchers-for-every-eligible-family | coverage-eligibility | price-cost | src/simulation/policy-pack-us-federal-positions.ts:445 |
| 81 | us-federal-positions:transport-water.expand-passenger-rail | service-delivered | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:479 |
| 82 | us-federal-positions:energy-environment.limit-power-plant-carbon | right-permission | tax | src/simulation/policy-pack-us-federal-positions.ts:517 |
| 83 | us-federal-positions:agriculture.cut-farm-subsidies | service-delivered | price-cost | src/simulation/policy-pack-us-federal-positions.ts:555 |
| 84 | us-federal-positions:emergencies.states-share-disaster-costs | service-delivered | price-cost | src/simulation/policy-pack-us-federal-positions.ts:593 |
| 85 | us-federal-positions:justice-rights.reduce-mandatory-minimums | legal-outcome | None assigned here | src/simulation/policy-pack-us-federal-positions.ts:632 |
| 86 | us-federal-positions:government.ban-congressional-stock-trading | right-permission | legal-outcome | src/simulation/policy-pack-us-federal-positions.ts:671 |
| 87 | us-federal-positions:science-communications.national-data-privacy | price-cost | right-permission | src/simulation/policy-pack-us-federal-positions.ts:705 |
| 88 | us-federal-positions:territories-culture.statehood-for-dc | institution-rule | right-permission | src/simulation/policy-pack-us-federal-positions.ts:749 |
| 89 | us-policy-positions:labor-workforce.city-minimum-wage | pay | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:2976 |
| 90 | us-policy-positions:civil-family-community.city-nondiscrimination-ordinance | right-permission | pay, legal-outcome | src/simulation/policy-pack-us-policy-positions.ts:3016 |
| 91 | us-policy-positions:government-operations.council-term-limits | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:3079 |
| 92 | us-policy-positions:government-operations.independent-ward-commission | institution-rule | None assigned here | src/simulation/policy-pack-us-policy-positions.ts:3120 |

## Existing cause readers and result writers

Measured reusable resolver: src/simulation/outcome-web/index.ts:424 outcomeMeasure(key: string): OutcomeMeasure|null returns registered readers and derived place measures. Its law-cause branch at line 486 resolves the catalog question and lawInForce at line 497. Its read signature is (world, jurisdictionId, asOf) → number|null, with an explicit unit at line 159. Null is an unrecorded cause, not zero. Keep existing link keys as stable evidence references, and bind onward rows to the saved parent exposure instead of replacing a missing child/service record with law=yes.

Measured current result writer: src/simulation/outcome-web/place-outcomes.ts:154 placeOutcomesForMonth creates PlaceOutcomeRecord rows; placeOutcomesHandler at line 316 appends one deduplicated month to world.placeOutcomes.months at line 334. PlaceOutcomeRecord at place-outcome-store.ts:27 identifies measure, place, jurisdiction, month, base, multiplier, value and link-key/factor causes. It carries no person-level preschool exposure or graduation identity. There is no generic exported arbitrary-measure setter in these inspected modules.

Required integration: reuse the measure/unit resolver and existing saved domain/result writers; the same admitted consequence row and dispatch contract handles direct and onward results. The old outcomeFactor at outcome-web/index.ts:687 still applies link factors and drawnLinkSize at line 715. Disable or delegate each migrated old path before activating its replacement so a link cannot apply twice. Existing seeded size/drift behavior is not an approved new capacity or exposure calculation.

## Named saved example and team action

Measured historical example: Jennifer Conway in Appomattox, Virginia, has saved teacher pay terms of 189,200 cents before and 224,000 cents after in docs/codex/handbacks/team-5-teacher-five-state-receipt.json:20. Three transfers each record 224,000 cents at lines 45, 51 and 57. That preserved receipt demonstrates a named pay-term/payment chain; it is not a fresh D9 run or proof of new generic handlers. Teacher-floor and minimum-wage rows use pay with different supported selectors and terms.

Coordinator owns catalog schema, selector admission, unit checking and shared dispatcher. Team2 builds the released pay adapter; existing builders translate their assigned rows. A right-permission or institution-rule classification cannot turn an absent license, meeting or case producer into an observed result. Unsupported capability errors must name the exact missing selector, term, unit or writer. No new per-law month/index claims are made.

## Method and remaining gaps

Measured: the map covers all 92 prior inventory keys exactly once, checks current catalog source locations, and retains old per-law source findings under their original inspection head in the JSON. Those older findings are historical inputs, not renewed D9 runtime acceptance. This work ran zero simulation tests and launched zero new campaigns. The existing D9 nationwide campaign remains live; CTO’s next restart is after the pay engine lands.
