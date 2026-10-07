# Law batches LW-01 to LW-32: wire every law that does nothing yet, or does nothing to a person

Generated 2026-10-06 by cto-notes/tools/laws_wired.mjs against main. Rerun it to refresh.

## Ownership rule (Opus ruling, #2424, Oct 6 ~5:05 a.m.)

- Session 20 is sole writer of the applyLawConsequences core, the kind registry and the landing core
- Session 19 is sole writer of lawInForce
- An LW batch writes ONLY data rows plus, for a new kind, one kind-module file registered through the registry's registration point
- No batch edits the core files
- If no data-driven registration point exists yet, Session 20's next PR adds a folder-loaded kind registry before batches add kinds
- A batch that needs a core change posts the need on the board and waits on Session 20 while finishing its data rows

## Rules (all batches)

- Zero dice. Nothing is rolled anywhere in a law's effect.
- Nothing blank: where the law's own number is not known for a place, estimate it from similar places and mark it as an estimate (basis and the places used on the row).
- One law engine. Add rows as data (WHO / WHAT / HOW MUCH) and register a kind through `src/simulation/law-consequence-registry.ts` if one is missing. No per-law code paths.
- Make the effect land on named people through Session 20's landing engine (`applyLawConsequences`, `recordLawExposure`, the `law-effects-noticed.ts` pattern), so the exposure names the person, the law and the amount.
- One PR per batch. Post "Session N takes LW-xx" on #2424 before starting. Whoever merges second rebases.
- Proof for each law: start a new game in a random place where the law is in force and print the cause chain: law, effect, person.

## Today's numbers

87 of 122 laws fire an effect; 14 write an exposure on a named person; 29 change a named person's record without telling them; 79 act on places or nothing. 35 laws have no running effect (jobs "effect"), 73 run but never reach a person (jobs "landing").

Job types: **effect** = no consequence row and no built path yet: add rows, register the kind, land on people. **landing** = the effect runs but only on places, or on a person's record with no exposure: add the person landing.

## LW-01: Government operations and elections (no running effect)

Laws:

- `us-policy-positions:government-operations.require-photo-id-to-vote`: Require photo identification to vote
  - Today: link voter-id-to-turnout [about-zero] (data/research/outcome-web/links.json:2264); link voter-id-to-registration [about-zero] (data/research/outcome-web/links.json:2789)
- `us-policy-positions:government-operations.ban-lobbying-after-office`: Cooling-off period before lobbying
  - Today: question declared at src/simulation/policy-pack-us-policy-positions.ts:598
- `us-policy-positions:government-operations.same-day-voter-registration`: Same-day voter registration
  - Today: link same-day-registration-to-youth-turnout [outcome-not-produced] (data/research/outcome-web/links.json:2283)

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-02: Justice and public safety (no running effect)

Laws:

- `us-policy-positions:justice-public-safety.child-access-prevention`: Responsibility for unsecured guns near children
  - Today: link child-access-law-to-youth-gun-deaths [outcome-not-produced] (data/research/outcome-web/links.json:338)
- `us-policy-positions:justice-public-safety.raise-handgun-purchase-age`: Handgun buyers must be 21
  - Today: link min-age-to-youth-gun-suicide [outcome-not-produced] (data/research/outcome-web/links.json:408)
- `us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement`: Local police partner with federal immigration enforcement
  - Today: link enforcement-to-hispanic-enrollment [outcome-not-produced] (data/research/outcome-web/links.json:1464); link enforcement-to-undocumented-employment [outcome-not-produced] (data/research/outcome-web/links.json:2043); link enforcement-to-us-born-employment [outcome-not-produced] (data/research/outcome-web/links.json:2063)

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-03: Federal taxation and revenue (no running effect)

Laws:

- `us-tax-terms:federal.income-tax-terms`: Set federal government personal income tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:federal.sales-tax-terms`: Set federal government sales tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:federal.payroll-tax-terms`: Set federal government payroll tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:federal.corporate-tax-terms`: Set federal government corporate income tax terms
  - Today: nothing: no row, no path, no link

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-04: Budget and taxes (no running effect)

Laws:

- `us-tax-terms:state.income-tax-terms`: Set state personal income tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:state.sales-tax-terms`: Set state sales tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:state.property-tax-terms`: Set state property tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:state.payroll-tax-terms`: Set state payroll tax terms
  - Today: nothing: no row, no path, no link

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-05: Budget and taxes (no running effect)

Laws:

- `us-tax-terms:state.corporate-tax-terms`: Set state corporate income tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:county.income-tax-terms`: Set county personal income tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:county.sales-tax-terms`: Set county sales tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:county.property-tax-terms`: Set county property tax terms
  - Today: nothing: no row, no path, no link

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-06: Budget and taxes (no running effect)

Laws:

- `us-tax-terms:county.payroll-tax-terms`: Set county payroll tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:county.corporate-tax-terms`: Set county corporate income tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:city.income-tax-terms`: Set city personal income tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:city.sales-tax-terms`: Set city sales tax terms
  - Today: nothing: no row, no path, no link

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-07: Budget and taxes (no running effect)

Laws:

- `us-tax-terms:city.property-tax-terms`: Set city property tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:city.payroll-tax-terms`: Set city payroll tax terms
  - Today: nothing: no row, no path, no link
- `us-tax-terms:city.corporate-tax-terms`: Set city corporate income tax terms
  - Today: nothing: no row, no path, no link

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-08: Mixed areas: Education; Business, commerce and economic development; Civil, family and community policy; Technology, privacy and cybersecurity (no running effect)

Laws:

- `us-policy-positions:education.state-curriculum-standards`: Set curriculum at the state level
  - Today: link curriculum-standards-to-math [about-zero] (data/research/outcome-web/links.json:3974)
- `us-policy-positions:business-commerce.cap-development-incentives`: Cap development incentives
  - Today: link incentive-cap-to-poverty [about-zero] (data/research/outcome-web/links.json:4296)
- `us-policy-positions:civil-family-community.local-control-of-library-materials`: Local control of library materials
  - Today: link library-materials-to-reading [size-not-set] (data/research/outcome-web/links.json:4979)
- `us-policy-positions:technology-privacy.consumer-data-privacy-law`: Consumer data privacy law
  - Today: link privacy-law-to-earnings [about-zero] (data/research/outcome-web/links.json:4946)

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-09: Mixed areas: Technology, privacy and cybersecurity; Immigration, citizenship and border administration; Federal education assistance and research; Emergency management and domestic resilience (no running effect)

Laws:

- `us-policy-positions:technology-privacy.age-verification-for-social-media`: Age verification for social media
  - Today: question declared at src/simulation/policy-pack-us-policy-positions.ts:2942
- `us-federal-positions:immigration.admit-more-immigrants`: Admit more immigrants
  - Today: link more-immigration-to-workforce [size-not-set] (data/research/outcome-web/links.json:3400); link immigration-to-crime [about-zero] (data/research/outcome-web/links.json:4516)
- `us-federal-positions:education.forgive-student-loans`: Forgive federal student loans
  - Today: link student-debt-relief-to-finances [size-not-set] (data/research/outcome-web/links.json:3380); link student-loan-forgiveness-to-poverty [about-zero] (data/research/outcome-web/links.json:4613)
- `us-federal-positions:emergencies.states-share-disaster-costs`: States share more disaster costs
  - Today: question declared at src/simulation/policy-pack-us-federal-positions.ts:593

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-10: Mixed areas: Federal justice, rights and constitutional institutions; Federal administration, Congress and public accountability (no running effect)

Laws:

- `us-federal-positions:justice-rights.reduce-mandatory-minimums`: Reduce mandatory minimum sentences
  - Today: link mandatory-minimum-cut-to-federal-prisoners [outcome-not-produced] (data/research/outcome-web/links.json:3214); link federal-mandatory-minimums-to-crime [about-zero] (data/research/outcome-web/links.json:4535)
- `us-federal-positions:government.ban-congressional-stock-trading`: Ban stock trading by members of Congress
  - Today: link congress-stock-ban-to-member-returns [size-not-set] (data/research/outcome-web/links.json:4926)

One-PR job: add the consequence rows for each law (WHO/WHAT/HOW MUCH as data, sized from current law and similar places, estimates marked), register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-11: Budget and taxes (effect runs, no landing on people)

Laws:

- `us-policy-positions:fiscal.cap-property-tax-growth`: Cap property tax growth
  - Today: outcome-web via property-tax-cap-to-math; link property-tax-cap-to-math [built] (data/research/outcome-web/links.json:4035)
- `us-policy-positions:fiscal.exempt-groceries-from-sales-tax`: Exempt groceries from sales tax
  - Today: outcome-web via grocery-exemption-to-food-insecurity; link grocery-exemption-to-poverty [about-zero] (data/research/outcome-web/links.json:4055); link grocery-exemption-to-food-insecurity [built] (data/research/outcome-web/links.json:4632)
- `us-policy-positions:fiscal.balanced-operating-budget`: Require a balanced operating budget
  - Today: outcome-web via balanced-budget-to-borrowing-cost; link balanced-budget-to-borrowing-cost [built] (data/research/outcome-web/links.json:4823)
- `us-policy-positions:fiscal.fund-pensions-to-schedule`: Fund pensions on schedule
  - Today: outcome-web via pension-funding-to-borrowing-cost; link pension-funding-to-borrowing-cost [built] (data/research/outcome-web/links.json:4844)
- `us-policy-positions:fiscal.minimum-reserve-balance`: Minimum reserve balance
  - Today: outcome-web via reserve-balance-to-borrowing-cost; link reserve-balance-to-borrowing-cost [built] (data/research/outcome-web/links.json:4865)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-12: Government operations and elections (effect runs, no landing on people)

Laws:

- `us-policy-positions:government-operations.independent-redistricting`: Independent redistricting commission
  - Today: outcome-web via independent-redistricting-to-turnout; link independent-redistricting-to-turnout [built] (data/research/outcome-web/links.json:4147)
- `us-policy-positions:government-operations.automatic-voter-registration`: Automatic voter registration
  - Today: outcome-web via automatic-registration-to-turnout; link automatic-registration-to-turnout [built] (data/research/outcome-web/links.json:2808)
- `us-policy-positions:government-operations.legislative-term-limits`: Limit legislative terms
  - Today: seat-turnover via src/simulation/nationwide-world/state-legislative-term-limits.ts; link term-limits-to-turnout [about-zero] (data/research/outcome-web/links.json:4167)
- `us-policy-positions:government-operations.broaden-local-authority`: Broaden local authority
  - Today: local-powers via src/simulation/governing/question-authority.ts

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-13: Government operations and elections (effect runs, no landing on people)

Laws:

- `us-policy-positions:government-operations.council-term-limits`: Limit council terms
  - Today: seat-turnover via src/simulation/living-world/local-council-term-limits.ts
- `us-policy-positions:government-operations.independent-ward-commission`: Independent ward commission
  - Today: seat-turnover via src/simulation/living-world/local-elections.ts
- `us-policy-positions:government-operations.all-mail-voting`: Ballots mailed to every voter
  - Today: outcome-web via all-mail-voting-to-turnout; link all-mail-voting-to-turnout [built] (data/research/outcome-web/links.json:2304); link all-mail-voting-to-party-share [about-zero] (data/research/outcome-web/links.json:2324)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-14: Education (effect runs, no landing on people)

Laws:

- `us-policy-positions:education.equalize-school-funding`: Equalize school funding across districts
  - Today: service-delivered row `us-policy-positions:education.equalize-school-funding:recorded-funded-service`; outcome-web via equalized-funding-to-spending; outcome-web via equalized-funding-to-math-proficiency; outcome-web via equalized-funding-to-graduation; link equalized-funding-to-spending [built] (data/research/outcome-web/links.json:2686); link equalized-funding-to-math-proficiency [built] (data/research/outcome-web/links.json:3546); link equalized-funding-to-graduation [built] (data/research/outcome-web/links.json:3588)
- `us-policy-positions:education.public-funds-for-private-schooling`: Public funds for private schooling
  - Today: service-delivered row `us-policy-positions:education.public-funds-for-private-schooling:recorded-funded-service`; outcome-web via vouchers-to-math-proficiency; outcome-web via vouchers-to-graduation; link vouchers-to-math-proficiency [built] (data/research/outcome-web/links.json:3630); link vouchers-to-graduation [built] (data/research/outcome-web/links.json:3672)
- `us-policy-positions:education.universal-preschool`: Universal preschool
  - Today: service-delivered row `us-policy-positions:education.universal-preschool:recorded-funded-service`; outcome-web via universal-childcare-to-mothers-work; outcome-web via universal-prek-to-graduation; outcome-web via universal-prek-to-math-proficiency; outcome-web via universal-prek-to-reading-proficiency; outcome-web via universal-prek-to-violent-crime; link universal-childcare-to-mothers-work [built] (data/research/outcome-web/links.json:2223); link universal-prek-to-graduation [built] (data/research/outcome-web/links.json:2644); link universal-prek-to-math-proficiency [built] (data/research/outcome-web/links.json:3420); link universal-prek-to-reading-proficiency [built] (data/research/outcome-web/links.json:3462); link universal-prek-to-violent-crime [built] (data/research/outcome-web/links.json:3504)
- `us-policy-positions:education.freeze-public-tuition`: Freeze public college tuition
  - Today: price-cost row `price-cost:recorded-public-tuition-freeze` (src/simulation/law-consequences/tuition-freeze-row.ts:7); link tuition-freeze-to-college-completion [about-zero] (data/research/outcome-web/links.json:4766)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-15: Health and human services (effect runs, no landing on people)

Laws:

- `us-policy-positions:health-human-services.expand-medicaid-eligibility`: Expand Medicaid eligibility
  - Today: coverage-eligibility row `coverage-eligibility:medicaid-expansion-person`; outcome-web via medicaid-expansion-to-coverage; outcome-web via medicaid-expansion-to-medical-debt; link medicaid-expansion-to-coverage [built] (data/research/outcome-web/links.json:2508); link medicaid-expansion-to-mortality [outcome-not-produced] (data/research/outcome-web/links.json:2542); link medicaid-expansion-to-medical-debt [built] (data/research/outcome-web/links.json:2576)
- `us-policy-positions:health-human-services.medicaid-work-requirement`: Work requirement for Medicaid
  - Today: coverage-eligibility row `coverage-eligibility:medicaid-work-rule-person`; outcome-web via work-requirement-to-coverage; link work-requirement-to-coverage [built] (data/research/outcome-web/links.json:837); link work-requirement-to-employment [about-zero] (data/research/outcome-web/links.json:876)
- `us-policy-positions:health-human-services.work-requirement-for-assistance`: Work requirement for assistance
  - Today: outcome-web via snap-work-requirement-to-participation; link snap-work-requirement-to-participation [built] (data/research/outcome-web/links.json:2610)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-16: Health and human services (effect runs, no landing on people)

Laws:

- `us-policy-positions:health-human-services.fund-behavioral-health-crisis-response`: Fund a behavioral health crisis response
  - Today: service-delivered row `us-policy-positions:health-human-services.fund-behavioral-health-crisis-response:recorded-funded-service`; outcome-web via crisis-response-to-crime; link crisis-response-to-crime [built] (data/research/outcome-web/links.json:3940)
- `us-policy-positions:health-human-services.harm-reduction-services`: Harm reduction services
  - Today: service-delivered row `us-policy-positions:health-human-services.harm-reduction-services:recorded-funded-service`; outcome-web via harm-reduction-to-overdose-deaths; link harm-reduction-to-crime [about-zero] (data/research/outcome-web/links.json:4094); link harm-reduction-to-overdose-deaths [built] (data/research/outcome-web/links.json:4652)
- `us-policy-positions:health-human-services.housing-first-homelessness`: Housing first
  - Today: service-delivered row `us-policy-positions:health-human-services.housing-first-homelessness:recorded-funded-service`; outcome-web via housing-first-to-homelessness; link housing-first-to-homelessness [built] (data/research/outcome-web/links.json:2928)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-17: Justice and public safety (effect runs, no landing on people)

Laws:

- `us-policy-positions:justice-public-safety.end-cash-bail`: End cash bail
  - Today: court-and-jail via src/simulation/justice/pretrial.ts; link end-cash-bail-to-pretrial-detention [outcome-not-produced] (data/research/outcome-web/links.json:2728); link end-cash-bail-to-violent-crime [about-zero] (data/research/outcome-web/links.json:4405)
- `us-policy-positions:justice-public-safety.mandatory-minimum-sentences`: Mandatory minimum sentences
  - Today: court-and-jail via src/simulation/justice/court-reasoning.ts; link mandatory-minimums-to-incarceration [size-not-set] (data/research/outcome-web/links.json:2749); link mandatory-minimums-to-violent-crime [about-zero] (data/research/outcome-web/links.json:4443)
- `us-policy-positions:justice-public-safety.civilian-oversight-of-police`: Civilian oversight of police
  - Today: outcome-web via civilian-oversight-to-crime; link civilian-oversight-to-crime [built] (data/research/outcome-web/links.json:4074)
- `us-policy-positions:justice-public-safety.permit-to-carry-concealed`: Require a permit to carry concealed
  - Today: outcome-web via concealed-carry-permit-to-firearm-homicide; outcome-web via carry-permit-to-violent-crime; link concealed-carry-permit-to-firearm-homicide [built] (data/research/outcome-web/links.json:2769); link carry-permit-to-violent-crime [built] (data/research/outcome-web/links.json:4385)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-18: Justice and public safety (effect runs, no landing on people)

Laws:

- `us-policy-positions:justice-public-safety.raise-juvenile-court-age`: Raise the juvenile court age
  - Today: state-spending via src/simulation/public-budgets/month.ts; court-and-jail via src/simulation/justice/juvenile-court.ts; link juvenile-court-age-to-crime [about-zero] (data/research/outcome-web/links.json:3921)
- `us-policy-positions:justice-public-safety.restore-voting-after-sentence`: Restore voting after a sentence
  - Today: outcome-web via restore-voting-to-turnout; link restore-voting-to-turnout [built] (data/research/outcome-web/links.json:2828)
- `us-policy-positions:justice-public-safety.stand-your-ground`: Stand your ground
  - Today: outcome-web via stand-your-ground-to-homicide; link stand-your-ground-to-homicide [built] (data/research/outcome-web/links.json:359)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-19: Housing and land use (effect runs, no landing on people)

Laws:

- `us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones`: Allow multifamily housing in single-family zones
  - Today: outcome-web via housing-by-right-to-new-buildings; home-prices via src/simulation/living-world/housing-market.ts; link housing-by-right-to-new-buildings [built] (data/research/outcome-web/links.json:2889)
- `us-policy-positions:housing-land-use.rent-stabilization`: Rent stabilization
  - Today: price-cost row `price-cost:recorded-rent-stabilization` (src/simulation/law-consequences/rent-stabilization-row.ts:23); outcome-web via rent-control-to-rental-supply; outcome-web via rent-control-to-tenant-stays; rent-and-eviction via src/simulation/living-world/town-rent.ts; link rent-control-to-rental-supply [built] (data/research/outcome-web/links.json:1649); link rent-control-to-tenant-stays [built] (data/research/outcome-web/links.json:1668)
- `us-policy-positions:housing-land-use.by-right-permitting`: By-right permitting
  - Today: outcome-web via by-right-permitting-to-homelessness; home-prices via src/simulation/living-world/housing-market.ts; link by-right-permitting-to-homelessness [built] (data/research/outcome-web/links.json:4315)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-20: Housing and land use (effect runs, no landing on people)

Laws:

- `us-policy-positions:housing-land-use.inclusionary-requirement`: Inclusionary housing requirement
  - Today: rent-and-eviction via src/simulation/living-world/town-rent.ts; link inclusionary-to-homelessness [about-zero] (data/research/outcome-web/links.json:4360)
- `us-policy-positions:housing-land-use.preempt-local-housing-limits`: Preempt local housing limits
  - Today: outcome-web via housing-preemption-to-homelessness; home-prices via src/simulation/living-world/housing-market.ts; link housing-preemption-to-homelessness [built] (data/research/outcome-web/links.json:4335)
- `us-policy-positions:housing-land-use.right-to-counsel-in-eviction`: Right to counsel in eviction
  - Today: service-delivered row `us-policy-positions:housing-land-use.right-to-counsel-in-eviction:recorded-funded-service`; rent-and-eviction via src/simulation/living-world/town-rent.ts; link right-to-counsel-to-evictions [outcome-not-produced] (data/research/outcome-web/links.json:2908)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-21: Transportation, infrastructure and utilities (effect runs, no landing on people)

Laws:

- `us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit`: Shift highway funds to transit
  - Today: service-delivered row `us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit:recorded-funded-service`; outcome-web via highway-money-for-transit-to-service; link highway-money-for-transit-to-service [built] (data/research/outcome-web/links.json:5018)
- `us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours`: Additional rural transit service hours
  - Today: service-delivered row `us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours:recorded-funded-service`; state-spending via src/simulation/governing/program-governing.ts
- `us-policy-positions:transportation-infrastructure.fare-free-transit`: Fare-free transit
  - Today: service-delivered row `us-policy-positions:transportation-infrastructure.fare-free-transit:recorded-funded-service`; outcome-web via fare-free-transit-to-ridership; link fare-free-transit-to-ridership [built] (data/research/outcome-web/links.json:4886)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-22: Transportation, infrastructure and utilities (effect runs, no landing on people)

Laws:

- `us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax`: Mileage fee instead of fuel tax
  - Today: state-revenue via src/simulation/public-budgets/road-usage-charge.ts
- `us-policy-positions:transportation-infrastructure.public-broadband`: Public broadband
  - Today: service-delivered row `us-policy-positions:transportation-infrastructure.public-broadband:recorded-funded-service`; outcome-web via public-broadband-to-home-access; link public-broadband-to-home-access [built] (data/research/outcome-web/links.json:4726)
- `us-policy-positions:transportation-infrastructure.fix-it-first`: Fix it first
  - Today: outcome-web via fix-it-first-to-poor-roads; link fix-it-first-to-poor-roads [built] (data/research/outcome-web/links.json:5158)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-23: Business, commerce and economic development (effect runs, no landing on people)

Laws:

- `us-policy-positions:business-commerce.reduce-occupational-licensing`: Reduce occupational licensing
  - Today: outcome-web via licensing-reform-to-poverty; link licensing-reform-to-poverty [built] (data/research/outcome-web/links.json:4127)
- `us-policy-positions:business-commerce.legalize-cannabis-sales`: Legalize cannabis sales
  - Today: outcome-web via cannabis-sales-to-youth-use; outcome-web via cannabis-sales-to-overdose-deaths; state-revenue via src/simulation/public-budgets/rules.ts; link cannabis-sales-to-youth-use [built] (data/research/outcome-web/links.json:2962); link cannabis-sales-to-violent-crime [about-zero] (data/research/outcome-web/links.json:4424); link cannabis-sales-to-overdose-deaths [built] (data/research/outcome-web/links.json:4906)
- `us-policy-positions:business-commerce.cap-consumer-loan-rates`: Cap consumer loan rates
  - Today: outcome-web via loan-rate-cap-to-high-cost-borrowing; link loan-rate-cap-to-high-cost-borrowing [built] (data/research/outcome-web/links.json:2982)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-24: Labor and workforce (effect runs, no landing on people)

Laws:

- `us-policy-positions:labor-workforce.local-minimum-wage-authority`: Let localities set their own minimum wage
  - Today: authority-gate via src/simulation/governing/question-authority.ts
- `us-policy-positions:labor-workforce.public-sector-collective-bargaining`: Public-sector collective bargaining
  - Today: outcome-web via public-bargaining-to-earnings; link public-bargaining-to-graduation [about-zero] (data/research/outcome-web/links.json:3902); link public-bargaining-to-earnings [built] (data/research/outcome-web/links.json:4686)
- `us-policy-positions:labor-workforce.right-to-work`: Right to work
  - Today: outcome-web via right-to-work-to-turnout; link right-to-work-to-turnout [built] (data/research/outcome-web/links.json:3882)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-25: Environment, energy and climate (effect runs, no landing on people)

Laws:

- `us-policy-positions:environment-energy.clean-electricity-standard`: Clean electricity standard
  - Today: outcome-web via clean-electricity-to-price; outcome-web via clean-electricity-to-particulates; link clean-electricity-to-price [built] (data/research/outcome-web/links.json:3082); link clean-electricity-to-particulates [built] (data/research/outcome-web/links.json:4462)
- `us-policy-positions:environment-energy.price-carbon`: Price carbon emissions
  - Today: outcome-web via carbon-price-to-emissions; outcome-web via carbon-price-to-particulates; link carbon-price-to-emissions [built] (data/research/outcome-web/links.json:3022); link carbon-price-to-particulates [built] (data/research/outcome-web/links.json:4482)
- `us-policy-positions:environment-energy.ban-new-gas-hookups`: Ban new gas hookups
  - Today: outcome-web via gas-hookup-ban-to-child-asthma; link gas-hookup-ban-to-child-asthma [built] (data/research/outcome-web/links.json:4746)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-26: Environment, energy and climate (effect runs, no landing on people)

Laws:

- `us-policy-positions:environment-energy.restrict-building-in-flood-zones`: Restrict building in flood zones
  - Today: outcome-web via flood-zone-limits-to-damage; link flood-zone-limits-to-damage [built] (data/research/outcome-web/links.json:3102)
- `us-policy-positions:environment-energy.bottle-deposit`: Container deposit
  - Today: outcome-web via container-deposit-to-litter; outcome-web via container-deposit-to-prices; outcome-web via container-deposit-to-recycling; link container-deposit-to-litter [built] (data/research/outcome-web/links.json:3042); link container-deposit-to-prices [built] (data/research/outcome-web/links.json:3062); link container-deposit-to-recycling [built] (data/research/outcome-web/links.json:3122)
- `us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties`: Clean-air plan for counties that fail federal standards
  - Today: outcome-web via emission-rules-to-particulates; link emission-rules-to-particulates [built] (data/research/outcome-web/links.json:630)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-27: Agriculture and natural resources (effect runs, no landing on people)

Laws:

- `us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal`: Limit groundwater withdrawal
  - Today: outcome-web via groundwater-limits-to-irrigation-pumping; link groundwater-limits-to-irrigation-pumping [built] (data/research/outcome-web/links.json:5058)
- `us-policy-positions:agriculture-natural-resources.protect-farmland-from-development`: Protect farmland from development
  - Today: outcome-web via farmland-easements-to-farmland-lost; link farmland-easements-to-farmland-lost [built] (data/research/outcome-web/links.json:5038)
- `us-policy-positions:agriculture-natural-resources.expand-public-land-access`: Expand public land access
  - Today: service-delivered row `us-policy-positions:agriculture-natural-resources.expand-public-land-access:recorded-funded-service`

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-28: Civil, family and community policy (effect runs, no landing on people)

Laws:

- `us-policy-positions:civil-family-community.restrict-abortion`: Restrict abortion
  - Today: outcome-web via abortion-ban-to-births; outcome-web via abortion-ban-to-infant-deaths; link abortion-ban-to-births [built] (data/research/outcome-web/links.json:2163); link abortion-ban-to-infant-deaths [built] (data/research/outcome-web/links.json:2183)
- `us-policy-positions:civil-family-community.fund-public-libraries`: Fund public libraries
  - Today: service-delivered row `us-policy-positions:civil-family-community.fund-public-libraries:recorded-funded-service`; outcome-web via library-funding-to-reading; link library-funding-to-math [about-zero] (data/research/outcome-web/links.json:4186); link library-funding-to-reading [built] (data/research/outcome-web/links.json:4706)
- `us-policy-positions:civil-family-community.dedicated-parks-funding`: Dedicated parks funding
  - Today: service-delivered row `us-policy-positions:civil-family-community.dedicated-parks-funding:recorded-funded-service`; state-spending via src/simulation/public-budgets/month.ts

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-29: Mixed areas: Technology, privacy and cybersecurity; Federal budget, borrowing and fiscal operations; Monetary policy and the financial system; Defense, intelligence and military personnel (effect runs, no landing on people)

Laws:

- `us-policy-positions:technology-privacy.restrict-government-facial-recognition`: Restrict government facial recognition
  - Today: outcome-web via facial-recognition-limit-to-crime; link facial-recognition-limit-to-crime [built] (data/research/outcome-web/links.json:4243)
- `us-federal-positions:budget.pay-for-a-higher-debt-limit`: Pay for a higher debt limit
  - Today: outcome-web via federal-deficit-to-borrowing-cost; state-revenue via src/simulation/federal-outlay-laws.ts
- `us-federal-positions:monetary-financial.cap-consumer-loan-interest`: Cap consumer loan interest
  - Today: outcome-web via federal-loan-cap-to-high-cost-loans; link federal-loan-cap-to-high-cost-loans [built] (data/research/outcome-web/links.json:3355)
- `us-federal-positions:defense.grow-defense-spending`: Grow defense spending
  - Today: outcome-web via defense-contracts-to-earnings

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-30: Mixed areas: Foreign affairs and international commitments; Foreign trade and cross-border finance; Federal health coverage, research and standards; Retirement security and income assistance (effect runs, no landing on people)

Laws:

- `us-federal-positions:foreign-affairs.increase-foreign-aid`: Increase foreign aid
  - Today: service-delivered row `us-federal-positions:foreign-affairs.increase-foreign-aid:recorded-funded-service`; outcome-web via federal-deficit-to-borrowing-cost
- `us-federal-positions:trade.raise-tariffs`: Raise tariffs on imports
  - Today: outcome-web via tariffs-to-prices; link tariffs-to-prices [built] (data/research/outcome-web/links.json:3275)
- `us-federal-positions:health.medicare-drug-price-negotiation`: Medicare drug price negotiation
  - Today: outcome-web via drug-negotiation-to-out-of-pocket; link drug-negotiation-to-out-of-pocket [built] (data/research/outcome-web/links.json:3335)
- `us-federal-positions:social-insurance.raise-retirement-age`: Raise the Social Security retirement age
  - Today: outcome-web via retirement-age-to-older-work; outcome-web via retirement-age-to-poverty; link retirement-age-to-older-work [built] (data/research/outcome-web/links.json:3315); link retirement-age-to-poverty [built] (data/research/outcome-web/links.json:4496)

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-31: Mixed areas: Federal housing and community investment; Transportation and water infrastructure; Energy, environment and natural resources; Agriculture, food and rural development (effect runs, no landing on people)

Laws:

- `us-federal-positions:housing.vouchers-for-every-eligible-family`: Housing vouchers for every eligible family
  - Today: outcome-web via housing-vouchers-to-homelessness; link housing-vouchers-to-homelessness [built] (data/research/outcome-web/links.json:3295); link housing-vouchers-to-graduation [size-not-set] (data/research/outcome-web/links.json:4554); link housing-vouchers-to-crime [size-not-set] (data/research/outcome-web/links.json:4574)
- `us-federal-positions:transport-water.expand-passenger-rail`: Expand passenger rail
  - Today: service-delivered row `us-federal-positions:transport-water.expand-passenger-rail:recorded-funded-service`; outcome-web via federal-rail-expansion-to-riders
- `us-federal-positions:energy-environment.limit-power-plant-carbon`: Limit power plant carbon emissions
  - Today: outcome-web via power-plant-carbon-to-emissions; outcome-web via power-plant-carbon-to-particulates; link power-plant-carbon-to-emissions [built] (data/research/outcome-web/links.json:3235); link power-plant-carbon-to-particulates [built] (data/research/outcome-web/links.json:3255)
- `us-federal-positions:agriculture.cut-farm-subsidies`: Cut farm subsidies
  - Today: service-delivered row `us-federal-positions:agriculture.cut-farm-subsidies:recorded-payment-cap` (src/simulation/law-consequences/service-delivered-data.ts:72); outcome-web via farm-payments-cut-to-land-values

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).

## LW-32: Mixed areas: Science, space and communications; Tribal relations, territories and public culture (effect runs, no landing on people)

Laws:

- `us-federal-positions:science-communications.national-data-privacy`: National data privacy law
  - Today: business-costs via src/simulation/federal-data-privacy-law.ts
- `us-federal-positions:territories-culture.statehood-for-dc`: Statehood for the District of Columbia
  - Today: seat-turnover via src/simulation/living-world/statehood-seats.ts

One-PR job: keep the running effect and add the person landing: register the kind through the existing registry if missing, make it land on named people through the landing engine, and prove it from a new game in a random place where the law is in force (printed chain: law, effect, person).
