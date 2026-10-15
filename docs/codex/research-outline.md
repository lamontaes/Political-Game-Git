# Research outline: who governs each policy topic, what they can pass, where, and what it does

Draft for Lamontae's approval on the docket. Written by Claude CTO at 4:23 p.m. on September 29, 2026.

This outline is for the Codex research teams, **after** Lamontae approves it. It is bounded: exactly 187 topics, one output format, a fixed evidence bar, and a named checklist for every topic. The worked example of the quality bar is `transportation-infrastructure.md` in this folder.

## A. Scope, exactly

- **The 187 policy topics in the game's catalog:** 127 state and local, 60 federal. They're listed by area in section D, with their keys in `cto-notes/codex/issues-187.json`.
- **The 66 "dials" of the powers catalog:** `data/research/powers-catalog/catalog.json`, which say which level may act. Every topic maps to one or more dials; where no dial fits, the research proposes one.
- **The 56 places:** 50 states, D.C., Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana Islands.
- **Out of scope:** writing game code. This is research that produces data files and a readable report per area.

## B. The output for each topic

One JSON record per topic, validated against a schema. The fields:

1. `topicKey` and the topic's `catalogLevels` today.
2. `authorities`: each level that really acts, including special districts, tribes and school districts wherever they act. **Every body is simulated as an organization with real people**: its members or board, and staff. Where a body doesn't act yet, it still gets at least one staff member placed there, so the world has someone in that job.
   Levels are federal, state, D.C., territory, county, city, school district, special district and tribal. For each: what it does, the legal source (constitution article, statute or case) and a source link.
3. `interactions`: each pair or chain of levels. Each gets:
   - a `pattern` from this list:
     - federal floor;
     - field preemption;
     - conditional spending;
     - cooperative administration;
     - state preemption of local action (floor, ceiling or field);
     - delegation or enabling;
     - local administration of a state duty;
     - concurrent;
     - compact or authority;
   - the settings a law can change (for example, the match rate, the preemption type, waiver scope, delegation scope, and how often a program is renewed);
   - the source.
4. `decisions`: every recurring decision real governments make on the topic. Each gets:
   - the question in plain words, and its level or levels;
   - the terms a bill carries (amounts, dates, phase-in, sunset);
   - **at least one real example**: a place, a bill or measure number, the year, and a link, for a law enacted or seriously debated (passed a chamber, or went to voters) from 2010 to 2026;
   - `availability`: every bar is recorded with **what kind of law creates it** (the U.S. Constitution, a federal statute, a state constitution, a state statute, a city charter or an ordinance) and **how that kind of law is changed** (for example, a state constitutional amendment passes the legislature by the state's rule, then goes to voters). The game then lets the right body change the bar through the same law menu as everything else: pass rail or repeal rail, lower an age requirement from 35 to 25. Only a higher level's rule limits it. For each of the 56 places, whether that government may pass it: yes, no (with the constitutional or statutory bar cited), or only some localities (with the rule cited). For local decisions, the state rule that grants or bars local power (home rule, Dillon's rule, express preemption), plus the charter of any city of 250,000 or more that differs;
   - `effects`: what it moves in the world. Each effect gets a measure, a size with its range, the lag, the group affected, and the study (authors, year, venue, link). If no study sizes it, write `"no sized evidence"`. Never estimate an effect size without a source. The law still acts through its direct mechanism, such as the money it moves;
   - `startingLaw`: which places have it in force on January 1, 2026, cited.
5. `federalLink`: for each state or local topic, the federal topic or topics that fund or constrain it, and how (the program, the match, the conditions). The reverse link goes on the federal topics.
6. `systemRedesigns`: whole-system options for the area, not just programs. Examples:
   - health: a single payer, a public option, all-payer rate setting;
   - retirement: moving public pensions from a guaranteed benefit to accounts, a state auto-IRA, and Social Security's formula, retirement age and payroll cap.

   Each gets its real examples and its effects. **Lamontae, September 29: U.S. examples plus other countries' systems as models, and each redesign is broken into pieces that can be negotiated separately.** For example, a public option is split into who is eligible, the premium subsidy, provider payment rates, who runs it, and how it's funded, so a bill can carry some pieces and a deal can trade others.

7. `gameToday`: the game's current questions on this topic, and which decisions above they cover.

## C. Evidence rules

1. **Primary sources first:**
   - constitutions and statutes (state legislature sites, the U.S. Code, the Code of Federal Regulations);
   - court rulings;
   - agency data (Census of Governments, BLS, CMS, EPA, FHWA, FTA, NCES and others).
2. **Accepted 50-state surveys:** NCSL, the Council of State Governments, the Tax Foundation, the Urban Institute, Pew, ITEP, Ballotpedia, KFF, NCES, IIHS and APTA. Each carries its date.
3. **Effect sizes** come from peer-reviewed studies, government evaluations, or major research institutions' evaluations. A meta-analysis beats a single study. Each carries its range.
4. **Nothing is invented.** A decision with no real example is left out. An availability cell without a source is marked `"unresearched"`, not guessed. The game then applies the owner's estimate rule separately.
5. **Every figure carries its year.**

## D. The 187 topics, with the specific checks each needs

Counts in this section (such as "about 35 states") are starting points to verify, not facts to copy.

Every topic gets everything in section B. Beyond that, each area below lists what **must** be checked, because those are the known variation points and interactions.

### Budget and taxes (13)

- **Operating budget, Appropriations:** balanced-budget requirement type per state (NASBO); governor line-item veto (44 states); what happens without a budget (shutdown or continuing).
- **Capital budget, Debt and bonds:** constitutional debt limits; voter approval for general-obligation bonds, per state and for localities.
- **Income tax:** states with no income tax; constitutional bans or flat-rate clauses (Illinois, Pennsylvania uniformity); local income tax authority (37 states prohibit it).
- **Sales tax:** local-option rules and caps; exemptions; remote sellers (South Dakota v. Wayfair, 2018).
- **Property tax:** assessment and levy limits (Proposition 13 style); homestead exemptions; truth-in-taxation.
- **Excise taxes:** tobacco, alcohol, fuel, soda. Local excise authority (Philadelphia's beverage tax; state bans on soda taxes, such as California's 2018 freeze).
- **Fees and charges:** where fees count as taxes in court and need a vote.
- **Public pensions:** constitutional protection of benefits (Illinois, New York and others); funding rules.
- **Reserves:** rainy-day fund caps and deposit rules (the game has these).
- **Revenue sharing:** each state's formula to localities.
- **Procurement and fiscal controls:** state procurement codes; local purchasing thresholds.

### Government operations and elections (11)

- **Election administration:** who runs it (county, town or state) per state; voter ID; early voting; mail voting; certification.
- **Election rules:** primaries (open or closed), runoffs, ranked choice (Alaska and Maine; bans in Florida, Tennessee and others).
- **Ethics and disclosure:** state ethics commissions' powers; local ethics boards.
- **Lobbying regulation:** registration; the cooling-off period (the game's unwired question).
- **Open meetings and records:** each state's sunshine laws and exemptions.
- **Civil service:** merit systems; at-will reforms (Georgia 1996, Florida 2001).
- **Agency organization:** reorganization power (governor versus legislature).
- **State and local powers:** home rule versus Dillon's rule per state; the game has this.
- **Public contracting.**
- **Legislative and administrative procedure:** the veto override threshold; rulemaking review.
- **Redistricting:** commissions per state; local redistricting rules.

### Education (10)

- **School funding:** each state's formula; court-ordered adequacy rulings; local levy limits.
- **Teachers:** salary schedules; tenure; licensing; collective bargaining.
- **Curriculum and standards:** state versus local control (the game's unwired question); federal ESSA testing rules.
- **School safety:** armed staff laws; school resource officers.
- **Special education:** federal IDEA, a federal floor funded well below its promised 40%; state add-ons.
- **School choice:** vouchers and education savings accounts; Blaine amendments (Espinoza, 2020; Carson, 2022).
- **Early childhood:** pre-K programs and their funding.
- **College cost and aid:** tuition-setting authority (board or legislature); state aid programs.
- **Higher education governance:** board structures.
- **Career and technical education:** federal Perkins money with a state match.

### Health and human services (10)

- **Medicaid:** expansion status (41 states including D.C.); federal match rate by state; waivers (work requirements); territories' capped funding.
- **Health insurance access:** state marketplaces; individual mandates (5 states and D.C.); reinsurance waivers.
- **Hospitals and providers:** certificate-of-need laws (about 35 states); scope of practice.
- **Public health:** the state versus local health officer's powers (post-2021 limits in many states); vaccine mandates.
- **Behavioral health:** crisis response (988).
- **Substance use:** harm reduction; syringe services legality per state.
- **Child and family services:** child welfare; federal Title IV-E conditions.
- **Aging and disability services:** home and community-based waivers.
- **Food and income assistance:** SNAP (federal, run by states and counties); TANF block grant rules per state.
- **Homelessness services:** Continuum of Care funds through localities.

### Justice and public safety (11)

- **Criminal law and sentencing:** concurrent state and federal law; sentencing guidelines; mandatory minimums.
- **Policing:** state preemption of local police rules; civilian oversight authority.
- **Courts:** state versus county funding.
- **Prosecution and defense:** elected district attorneys; public defense systems (state, county or contract).
- **Prisons:** state-run.
- **Jails:** county-run.
- **Reentry:** record sealing and clean-slate laws.
- **Juvenile justice:** the age of adult jurisdiction per state.
- **Victim services:** federal VOCA funds.
- **Firearms:** state preemption of local gun laws (about 45 states); permitless carry (29 states); the Second Amendment (Bruen, 2022).
- **Emergency response:** 911 governance; fire districts.

### Housing and land use (10)

- **Zoning:** state enabling acts; state overrides (California SB 9 and SB 35; Oregon HB 2001 of 2019; Montana 2023).
- **Permitting:** shot clocks; by-right approval.
- **Housing supply and Housing affordability:** inclusionary zoning (banned in some states); housing trust funds.
- **Tenants and landlords:** rent control preemption (about 31 states preempt it); just cause eviction; right to counsel.
- **Building codes:** state-mandated codes versus local adoption.
- **Homelessness:** camping bans (Grants Pass, 2024).
- **Redevelopment:** tax increment financing (abolished in California in 2011).
- **Neighborhood planning.**
- **State housing preemption:** the game has this.

### Transportation, infrastructure and utilities (10)

Done in the worked example (`transportation-infrastructure.md`). Codex verifies every item marked **verify** and fills in availability for all 56 places.

### Business, commerce and economic development (10)

- **Occupational licensing:** universal recognition laws (about 20 states since 2019).
- **Business permits.**
- **Business regulation.**
- **Consumer protection:** state UDAP laws; attorney general powers; local consumer agencies (New York City).
- **Insurance regulation:** state-only under McCarran-Ferguson; federal flood insurance and ACA overlaps.
- **Banking and credit:** rate caps and payday lending (the game has these); federal preemption for national banks.
- **Alcohol, cannabis and gaming:** local option (dry counties); cannabis legal status per state; sports betting (Murphy v. NCAA, 2018); tribal gaming compacts.
- **Tourism:** lodging taxes.
- **Development incentives:** the game has these.
- **Downtown and industrial development:** business improvement districts.

### Labor and workforce (8)

- **Minimum wage:** a federal floor; state and local; state preemption of local minimum wages (about 25 states); the game has these.
- **Leave:** paid leave (13 states and D.C.); local sick-leave preemption.
- **Unemployment insurance:** federal-state cooperative; benefit weeks and amounts per state.
- **Workers' compensation:** state-run; Texas opt-out.
- **Workplace standards:** heat standards; state OSHA plans (22 states).
- **Collective bargaining:** right to work (26 states); public-sector bargaining (the game has these).
- **Public employment.**
- **Workforce training:** federal WIOA through state and local boards.

### Environment, energy and climate (11)

- **Air quality:** the federal Clean Air Act floor, run by states; California's waiver and states that follow it.
- **Water quality:** the Clean Water Act, delegated to states.
- **Waste and recycling:** bottle bills (10 states); extended producer responsibility for packaging (Maine and Oregon 2021, and others); local bag bans and state preemption of them.
- **Contaminated sites:** federal Superfund and state programs.
- **Conservation.**
- **Energy generation and the grid:** renewable standards (about 30 states); FERC versus the states.
- **Energy efficiency:** building energy codes.
- **Climate mitigation:** carbon pricing (RGGI, California cap and trade).
- **Climate resilience.**
- **Disaster mitigation.**
- **Environmental permitting:** state NEPA equivalents (about 15 states).

### Agriculture and natural resources (8)

- **Farming and ranching:** right to farm; animal welfare ballot measures (California Proposition 12, upheld 2023).
- **Forestry:** state forest practice acts.
- **Water allocation:** prior appropriation versus riparian, per state; groundwater law (the game has this).
- **Fisheries and wildlife:** state agencies; federal endangered species law.
- **Public lands:** federal versus state trust lands.
- **Food safety:** FDA and USDA, with state and local inspection.
- **Agricultural markets.**
- **Rural development.**

### Civil, family and community policy (9)

- **Civil rights:** state and local nondiscrimination (the game has these).
- **Family law:** divorce, custody, child support; federal Title IV-D conditions.
- **Reproductive policy:** each state's abortion law after Dobbs (2022); the game has this.
- **Children and youth.**
- **Libraries:** the game has these.
- **Arts and culture.**
- **Parks and recreation.**
- **Veterans:** state benefits.
- **Community institutions.**

### Technology, privacy and cybersecurity (6)

- **Privacy and data use:** comprehensive privacy laws (about 19 states).
- **Artificial intelligence:** Colorado 2024.
- **Cybersecurity.**
- **Platforms and social media:** minors' laws and their court challenges.
- **Telecommunications:** FCC preemption.
- **Digital government.**

### The 60 federal topics (20 areas of 3 each)

For each, check:

- the statute and agency that governs it;
- which decisions Congress makes, and which the executive or agencies make (the powers catalog's routes: statute, regulation, executive order, and so on);
- the state or local topics each funds or constrains, with the program, match and conditions;
- what the territories and D.C. are treated as (Medicaid caps, SNAP block grants in Puerto Rico).

## E. Batches and acceptance

1. **Batches:**
   - one file per area: `data/research/authorities/<area>.json` plus a readable `<area>.md`;
   - one pull request per area, reviewed by Claude CTO against the evidence rules;
   - order: transportation first, verifying the worked example; then housing, labor, health, education, budget and taxes, justice, government, business, environment, agriculture, civil and family, technology; then the federal areas.
2. **Acceptance per area:**
   - the schema validates;
   - every decision has at least one real example with a link;
   - every availability cell for all 56 places is sourced or marked "unresearched", and unresearched cells are listed;
   - every effect has a sourced size or says "no sized evidence";
   - every state and local topic has its federal links;
   - a count of decisions per topic, and of places where each is barred.
3. **Nothing goes into game code** from this research until Lamontae approves it on the docket. Codex job 13 then turns approved decisions into game questions, each one wired.

## F. Decisions for Lamontae (on the docket)

**All approved September 29, 4:58 p.m.** Question 8: U.S. examples plus other countries' systems, broken into negotiable pieces.

Answered September 29: 3 (the bar for decisions), 4 (effects: research only), 6 (the federal link) and 7 (batches) are approved. Revised after his changes: 1 (levels), 2 (patterns, now in plain words), 5 (availability: bars are changeable). New: 8 (whole systems).

1. **Levels.** Add special districts (transit, port, water, airport and flood authorities), tribal governments, and school districts wherever they really act.
2. **Interaction patterns.** Use the nine patterns in B3, each with its adjustable settings.
3. **The bar for including a decision.** At least one place enacted it or seriously debated it (a chamber passed it, or it went to voters) from 2010 to 2026.
4. **The bar for effects.** Sourced sizes only; otherwise "no sized evidence", with the law acting through its direct mechanism.
5. **Availability detail.** Every one of the 56 places for state decisions. For local decisions: the state rule, plus the charters of cities of 250,000 or more that differ.
6. **Federal and state topics linked.**
7. **Batching and order** as in E1.
8. **Whole-system redesigns: what counts as a real example?** Options:
   - U.S. only: anything enacted, passed a chamber, went to voters, or was scored by the CBO or a state fiscal office;
   - also systems other countries run, used as models;
   - other.
