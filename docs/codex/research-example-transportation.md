# Transportation, infrastructure and utilities: authorities, interactions, decisions, effects, availability

Draft by Claude CTO, 4:20 p.m. on September 29, 2026. It covers 10 state and local topics and 3 federal topics. Studies and statutes are named; items marked **verify** need a primary source checked before they go into data.

## Cross-cutting findings

1. **Federal and state topics aren't linked.** Federal surface transportation, aviation and water projects sit in the federal pack; roads, transit, rail, airports and water sit in the state pack; nothing connects them. Every federal highway, transit, rail, airport and water dollar reaches states and localities as **conditional spending**: a formula or grant, a local match, and conditions such as Buy America, Davis-Bacon wages, NEPA review and the Title VI civil-rights rules. The game needs one link table: federal program, then the state or local topic, then the match rate and conditions. Each is a setting a federal law can change.
2. **Special districts are missing.** Transit authorities, port authorities, airport authorities, water and sewer districts, flood control districts and toll authorities run much of this domain. Their boards are appointed by the state, county and city, sometimes elected, and they levy fees or taxes voters approved. The catalog's levels (state, county, city) leave them out. **Add `special-district` as a level for transit, rail (commuter), airports and ports, water and sewer, stormwater and utilities**, with a board whose appointing governments are recorded.
3. **Local taxes for transportation need state permission.** Local-option sales taxes for transportation are allowed in many states but not all. Some need voter approval (California: two-thirds for a special tax, under Proposition 13 and Proposition 218, lowered to 55% for some measures; **verify** current thresholds). Availability belongs on each place's fiscal-authority record (the game has `92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY`).

---

## Roads and bridges (`transportation-infrastructure.roads-and-bridges`)

**Catalog today:** state, county and municipality. One question: mileage fee instead of fuel tax (wired).

**Correct authorities:**

- **Federal:** Federal-Aid Highway Program (Title 23): formula funds, the Interstate standards, and a ban on tolling existing Interstates except under pilot programs (23 U.S.C. 301 and 129); the federal fuel tax of 18.4 cents a gallon.
- **State:** the state DOT owns state highways; fuel tax, registration fees, the road usage charge; distributes shared revenue to localities.
- **County:** county roads, a road levy, sometimes a local fuel tax where the state allows it.
- **City:** streets, sidewalks, speed limits on local streets where the state delegates it.
- **Special district:** toll authorities, such as a state turnpike commission.
- **Tribal:** Tribal Transportation Program roads.

**Interactions:**

- **Federal, then state:** conditional spending. The match is 80/20, or 90/10 on Interstates. Conditions: the drinking age 21 (South Dakota v. Dole, 1987), a 0.08 blood alcohol limit, Buy America, Davis-Bacon. Settings: the match rate, which conditions apply, the penalty share withheld (for example, 8% of highway funds for no 21 drinking age).
- **State, then local:** revenue sharing of fuel tax and registration fees by formula (the formula is a state setting); state preemption of local speed limits (varies: some states let cities set 20 or 25 mph by ordinance, and Oregon and Washington expanded this, **verify**); state approval of local tolling.

**Decisions:**

1. **Fuel tax rate, and indexing it to inflation.** State. About 22 states index or vary their rate (**verify** count, ITEP). Effect: gasoline demand elasticity about -0.05 to -0.1 short run, -0.3 long run (Hughes, Knittel and Sperling 2008; Brons and others 2008). Revenue falls about 0.84% a year as fuel economy rises (already in the game). Available in every state and D.C.; territories set their own. Local fuel taxes are allowed in about 12 states (**verify**).
2. **Road usage charge by the mile.** In the game. Oregon started it in 2015 (OReGO), Utah in 2020, Virginia in 2022, and Hawaii began charging electric vehicles in 2025.
3. **Electric vehicle registration fee.** State. More than 30 states charge one, typically $50 to $200 a year. Effect: a small drop in electric vehicle sales (**verify** study).
4. **Tolling and congestion pricing.** State law must authorize it, and federal approval is needed on federal-aid highways (the Value Pricing Pilot Program). Example: New York's Manhattan central business district tolling, which started January 5, 2025, at $9 a car at peak. Effect: traffic entering the zone fell about 7 to 11% in the first months (MTA reports, **verify**), with transit ridership up. Available only where state law authorizes it.
5. **Bonding for road capital, and voter approval of it.** State and local. Many states require voter approval for general-obligation bonds; see the Debt and bonds topic.
6. **Highway widening versus maintenance first.** State. Fix it first is already in the game. Effect of added lane-miles: vehicle miles rise about one for one, the "fundamental law of road congestion" (Duranton and Turner 2011), so congestion returns in 5 to 10 years.
7. **Complete streets and Vision Zero rules.** State and city. More than 1,700 complete-streets policies nationwide (Smart Growth America, **verify**). Effect: pedestrian deaths down where speeds drop; a lower speed limit of 20 mph cuts pedestrian fatality risk sharply (AAA Foundation, Tefft 2011).
8. **Automated speed and red-light cameras.** State law authorizes or bans them, and cities deploy them. About 20 states ban or limit speed cameras (IIHS, **verify**). Effect: red-light cameras cut fatal red-light crashes about 21% in large cities (IIHS 2011).
9. **Local speed limits.** City, only where the state delegates it.
10. **Local road levy or wheel tax.** County and city, where the state allows it.

**Game today:** 1 question. **Missing:** 2 to 10 above, plus the federal link.

---

## Transit (`transportation-infrastructure.transit`)

**Catalog today:** state, county and municipality. Three questions: shift highway funds to transit, rural transit service hours, fare-free transit.

**Correct authorities:**

- **Federal:** Federal Transit Administration formula grants (Sections 5307, 5311 rural and 5310 for older and disabled riders) and Capital Investment Grants (Section 5309) for new lines; ADA paratransit is required (a federal floor).
- **State:** state transit aid, the enabling law for transit authorities and their taxes.
- **Special district:** most transit is run by an authority (for example SEPTA, MARTA, King County Metro, which is a county department, and Denver RTD), with board seats appointed by member governments or elected (Denver RTD's board is elected, **verify**).
- **County and city:** member governments, local sales or property taxes put to voters.

**Interactions:**

- **Federal, then authority:** conditional spending. The capital match is 80/20, and Capital Investment Grants usually fund about 50%. The federal rule bars using federal operating money in large urban areas, with exceptions.
- **State, then local:** enabling law says what tax an authority may levy and whether voters must approve. State operating aid runs through a formula.
- **Member governments:** board appointment shares and a cost-sharing formula; a member may withdraw where state law allows it (Michigan towns opted out of SMART, **verify**).

**Decisions:**

1. **Dedicated transit sales tax by voter referendum.** Local, where state law enables it. Examples: Los Angeles Measure M (2016, half a cent, 70.15% yes); Atlanta's MARTA sales tax. Effect: service hours rise with revenue. Service elasticity of ridership is about +0.5 to +0.7 (TCRP Report 95).
2. **Fare level and fare-free service.** In the game. Fare elasticity is about -0.3 to -0.4 (TCRP 95); Kansas City went fare-free in 2020.
3. **Service hours and frequency.** In the game for rural service.
4. **Bus lanes and signal priority.** City. Effect: bus speeds up 5 to 15% (NACTO, **verify**).
5. **Transit authority governance:** board makeup, an elected versus appointed board, state takeover. State.
6. **Paratransit beyond the ADA minimum.** Authority.
7. **Transit-oriented zoning near stations.** State and city. Example: California SB 79 (2025) allows height near transit (**verify** passage). See Zoning.
8. **Capital line projects and the local match for federal grants.** Authority, and voters.
9. **Transit police and fare enforcement.** Authority and city.

**Availability:** local transit taxes are barred where state law doesn't enable them. Some states give no dedicated local option (**verify** list, APTA).

---

## Rail (`transportation-infrastructure.rail`)

**Catalog today:** state only, no questions. **This is Lamontae's example.**

**Correct authorities:**

- **Federal:**
  - The FRA sets safety standards. Railroad safety is largely **field-preempted** (Federal Railroad Safety Act, 49 U.S.C. 20106; states may add rules only for local safety hazards).
  - The Surface Transportation Board regulates freight rates and abandonments, and preempts state economic regulation of rail (ICC Termination Act, 49 U.S.C. 10501(b)).
  - It funds intercity passenger rail: the Federal-State Partnership and CRISI grants, $66 billion from the 2021 infrastructure law.
  - Amtrak is federally chartered.
- **State:** it sponsors Amtrak routes under 750 miles. Under PRIIA Section 209 (2008), states pay the costs of short and middle-distance routes: **28 state-supported routes, 20 state agencies**, carrying about half of Amtrak's riders (AASHTO; Amtrak FY2024 state fact sheets, for example New York $32.5 million, Massachusetts $21.5 million, Pennsylvania $20.2 million). States also run a state rail plan (required for federal grants), rail-crossing safety money, and short-line freight grants and credits. Some created high-speed rail authorities (the California High-Speed Rail Authority, Proposition 1A, 2008, $9.95 billion in bonds).
- **Special district:** commuter rail authorities (Metra, NJ Transit, Caltrain), some run by states and some by regional authorities.
- **County and city:** station-area zoning, crossing closures in cooperation with the railroad, and a local match for station projects. They **cannot** regulate rail operations (federal preemption).

**Interactions:**

- **Federal and state:** state sponsorship is **required** for routes under 750 miles, or the service ends; the cost-sharing method is set by the Section 209 policy. Settings: the state's share, and which routes a state keeps.
- **Federal preemption:** states and localities can't regulate freight rail operations or rates. They **can** fund, plan, zone and negotiate crossings.
- **State and local:** the local share of station and crossing projects.

**Decisions:**

1. **Fund or drop a state-supported Amtrak route.** State. It carries an annual appropriation. Examples: Virginia's Transforming Rail in Virginia (2019 to 2021, bought rail right of way, **verify**); Indiana funded, then ended, the Hoosier State (2019).
   - Effect: route ridership. Virginia's routes grew strongly after frequency was added (**verify** figures). Road trips shift, and emissions fall per diverted trip.
   - Availability: every state may fund it. Old "internal improvements" clauses once barred state railroad investment (Michigan 1850, Wisconsin 1848). Wisconsin later amended its constitution to allow transportation appropriations (**verify** the year and article), and Michigan funds its routes through its transportation fund. **Research: each state's current constitutional credit, gift and internal-improvement clauses as they apply to rail.**
2. **Create and fund a high-speed or new intercity rail authority and bond.** State. Example: California Proposition 1A (2008). Effect: capital spending and jobs; ridership only when a segment opens. Cost overruns are common (Flyvbjerg: rail projects overrun about 45% on average, **verify**).
3. **Short-line freight rail tax credit or grants.** State: Georgia, Oregon, Alabama and others (**verify** list). Federal: the 45G credit, made permanent in 2020. Effect: track upgraded to 286,000-pound cars keeps freight off roads and lowers road damage (**verify** size).
4. **Grade-crossing safety money and separations.** State and local, with federal Section 130 and the Railroad Crossing Elimination Program. Effect: about 2,000 crossing collisions a year nationally (FRA). A separation removes collision risk at that crossing.
5. **Quiet zones.** City, under FRA rules. Horns are silenced where safety measures are added.
6. **Commuter rail service and fares.** Authority; see Transit.
7. **Station-area zoning.** City; see Zoning and Housing supply.
8. **Buy right of way from freight railroads for passenger use.** State. Virginia bought track from CSX in 2021 (**verify**).
9. **Two-person crew rules.** State laws were contested; the FRA issued a federal rule in 2024 requiring two people. State rules stand only where they aren't preempted (**verify**).

**Game today:** no questions at state or local level; federal "Expand passenger rail" only.

---

## Airports and ports (`transportation-infrastructure.airports-and-ports`)

**Catalog today:** state, county and municipality. No questions.

**Correct authorities:**

- **Federal:** the FAA controls airspace, flight paths and safety (**field preemption**). The Airport Improvement Program (AIP) funds capital with 75 to 95% federal shares. The Passenger Facility Charge is capped at $4.50 a boarding by federal law. The Airport Noise and Capacity Act (1990) limits local noise restrictions. For ports, the Army Corps dredges federal channels, funded by the Harbor Maintenance Tax. Customs and Border Protection runs the border, and the Maritime Administration handles the rest.
- **State:** state aviation funds and state port authorities (Georgia Ports Authority, Virginia Port Authority).
- **Special district, county or city:** airports are owned by cities (for example Chicago), counties (Miami-Dade) or authorities (the Metropolitan Washington Airports Authority; the Port Authority of New York and New Jersey, an interstate compact).
- **City:** zoning around the airport (height and land use), noise insulation programs.

**Interactions:**

- **Federal field preemption:** localities can't set flight paths or ban aircraft types.
- **Conditional spending:** grant assurances require that airport revenue stay at the airport, with no diversion to the city's general fund. The federal law and the assurances are the settings.
- **Compact:** a two-state port authority needs both states' laws and congressional consent.

**Decisions:**

1. **The airport's capital program and its Passenger Facility Charge.** Owner, within the federal cap.
2. **Noise insulation and land-use buffers.** City and owner, under Part 150.
3. **Privatization or long-term lease of the airport.** Owner, with federal approval (the Airport Investment Partnership Program; San Juan was leased in 2013).
4. **Port channel deepening: the local share.** State or port, with Army Corps cost sharing.
5. **Port and airport minimum wages.** Owner and city. Examples: SeaTac's Proposition 1 (2013), $15; Los Angeles airport concession wages. Effect: wages and headcount for airport workers (**verify** studies).
6. **State aviation fuel tax use.** State. Federal rules require it be spent on aviation since 2014 (**verify**).
7. **Governance of the authority:** board appointments. State and member governments.

---

## Water and sewer (`transportation-infrastructure.water-and-sewer`)

**Catalog today:** county and municipality. No questions.

**Correct authorities:**

- **Federal:** the Safe Drinking Water Act sets enforceable maximum contaminant levels, a **federal floor**, and states run it with "primacy". Examples: the 2024 limits on PFAS chemicals, and the 2024 Lead and Copper Rule Improvements, which require replacing lead service lines within about 10 years (**verify** the status after 2025 changes). The Clean Water Act sets wastewater discharge permits (NPDES), which most states administer. State Revolving Funds are **conditional spending**, with a 20% state match.
- **State:** primacy agency; the utility commission regulates **investor-owned** water utilities' rates; state law on privatization. **Fair-market-value laws** in about 15 states (for example Pennsylvania's Act 12 of 2016, **verify** count) let private utilities buy public systems at appraised value, which raises customer rates.
- **County, city and special district:** most water systems are municipal or special districts, and they set their own rates without commission review in most states.

**Interactions:**

- **Federal floor, with states allowed to be stricter** (New Jersey and others set PFAS limits early).
- **State oversight of local rates:** varies. In most states it covers only investor-owned utilities, but some states regulate municipal utilities serving outside city limits (**verify** list).

**Decisions:**

1. **Water and sewer rate increases and rate structure.** Utility board or council. Tiered conservation rates or flat rates.
2. **Low-income rate assistance.** Local; state law sometimes limits using rate revenue for discounts (California's Proposition 218 cost-of-service rule constrains it, **verify**).
3. **Shutoff protections for unpaid bills.** State and local. California SB 998 (2018) delays shutoffs.
4. **Lead line replacement money and mandates.** State and local. Illinois (2021) requires full replacement with deadlines (**verify**). Effect: blood lead levels in children fall. Newark replaced about 23,000 lines in under 3 years (2019 to 2021, **verify**).
5. **Sell a public system to a private utility.** City. Fair-market-value laws raise the price and the rates that follow.
6. **Regional consolidation.** State and local.
7. **Fluoridation.** State or local. Utah (2025) and Florida (2025) banned it statewide (**verify**). Effect: cavities in children rise over years (Cochrane 2024 review finds a smaller benefit than older studies, **verify**).
8. **Bonds for treatment plants.** Local, sometimes with voter approval.

---

## Stormwater (`transportation-infrastructure.stormwater`)

**Correct authorities:**

- **Federal:** Clean Water Act municipal stormwater permits (MS4), through the states.
- **State:** permits and enabling law for stormwater fees.
- **County, city and special district:** a stormwater utility fee (about 2,000 or more exist; Western Kentucky University survey, **verify**); flood control districts (Harris County Flood Control District).

**Decisions:**

1. **Create a stormwater utility fee**, based on paved area. Local, where state law allows. Some courts treated fees as taxes needing voter approval (Proposition 218 in California; Missouri's Hancock Amendment cases, **verify**).
2. **Green infrastructure requirements for new development.** Local.
3. **Flood control bond.** Special district and voters. Example: Harris County's $2.5 billion bond (2018).
4. **Floodplain building limits.** In the game as a law ("restrict building in flood zones").

---

## Broadband (`transportation-infrastructure.broadband`)

**Catalog today:** state, county and municipality. One question: public broadband.

**Correct authorities:**

- **Federal:** the FCC; the BEAD program ($42.45 billion, run by NTIA and passed through states); the Universal Service Fund.
- **State:** broadband office, grant programs, **limits on municipal broadband**. About 16 states restrict public networks (BroadbandNow 2024, **verify**). North Carolina's HB 129 (2011) is an example.
- **City and county:** build public networks where allowed (Chattanooga EPB, 2010), dig-once policies, rights-of-way and pole attachment fees.
- **Electric cooperatives:** special providers.

**Interactions:**

- **Federal money through the states** (BEAD's state plans and conditions).
- **State preemption of local networks:** a ceiling or an outright ban. The FCC's attempt to preempt state limits was struck down (Tennessee v. FCC, 6th Cir. 2016).

**Decisions:**

1. **Allow or restrict municipal broadband.** State. Setting: a ban, a referendum requirement, or allowed only where no private provider exists.
2. **Build a public network.** City, where allowed. In the game.
3. **State broadband grant program** and matching BEAD.
4. **Dig-once and pole attachment rules.** State and city.
5. **Affordability requirements on subsidized providers.** State, within BEAD.

**Effects:** broadband availability raises employment and property values modestly (Kolko 2012; Whitacre and others 2014, **verify** sizes).

---

## Utility regulation (`transportation-infrastructure.utility-regulation`)

**Catalog today:** state only. No questions.

**Correct authorities:**

- **Federal:** FERC regulates wholesale power, interstate transmission and natural gas pipelines (Federal Power Act, Natural Gas Act), and **preempts** states on wholesale rates (Hughes v. Talen, 2016). NERC reliability standards.
- **State:** the public utility commission regulates investor-owned utilities' retail rates. It is elected in about 11 states (Georgia, Arizona and others, **verify**) and appointed elsewhere. States also decide whether to restructure the retail market (Texas, Pennsylvania and others allow retail choice).
- **City:** municipal utilities (Los Angeles DWP, Austin Energy) set their own rates. Franchise agreements with investor-owned utilities.
- **Cooperatives:** member-owned, often exempt from commission rate review.

**Decisions:**

1. **Approve or deny a rate increase.** The commission: a return on equity (typically about 9.5 to 10%) and the base the utility may earn on. Effect: household bills.
2. **Winter and heat disconnection protections.** State or commission.
3. **Net metering** for rooftop solar. State; see Energy.
4. **Elected versus appointed commission.** State constitution or statute.
5. **Retail choice (deregulation) or return to regulation.** State.
6. **Securitization of storm or plant-retirement costs.** State.
7. **Wildfire liability and the utility's duty to shut off power.** State. California AB 1054 (2019) created a wildfire fund.
8. **Public takeover (municipalization).** City, where allowed. Boulder tried and abandoned it in 2020.

---

## Public facilities (`transportation-infrastructure.public-facilities`)

**Decisions:** courthouse, library and school construction bonds (voter approval rules vary by state); ADA upgrades (a federal floor); public-private partnerships (state authorization varies, **verify** list); energy retrofits of public buildings.

---

## Construction and maintenance (`transportation-infrastructure.capital-construction-and-maintenance`)

**Catalog today:** fix it first (wired).

**Decisions:**

1. **State prevailing wage law.** About 25 states have one. Seven repealed theirs from 2015 to 2018: West Virginia, Indiana, Kentucky, Wisconsin, Arkansas, Michigan and New Hampshire (earlier). Michigan restored it in 2023 (**verify** each). Federal Davis-Bacon applies on federal jobs. Effect: construction wages, and project costs (studies disagree: a small effect to +10%, **verify**).
2. **Project labor agreements on public work.** State and city. Some states ban requiring them.
3. **Design-build and other delivery methods.** State authorization varies.
4. **Buy American or buy state.** State.
5. **Asset management plans and a maintenance-first rule.** In the game (fix it first).

---

## Federal topics in this area

- **Federal surface transportation programs:** reauthorization of the highway and transit law; formula splits; the federal fuel tax (18.4 cents a gallon, unchanged since 1993); the Highway Trust Fund transfers; Amtrak funding; conditions (Buy America, drinking age and others).
  - Decisions: raise or index the federal fuel tax; set formula shares; add or remove conditions; fund intercity rail grants; set the tolling rules for Interstates.
  - Each links to the state topics above.
- **Aviation and maritime:** FAA reauthorization, the PFC cap, air traffic control; the Jones Act (coastwise shipping must use U.S.-built, U.S.-crewed ships); the Harbor Maintenance Tax. All federal field.
- **Federal water projects:** Water Resources Development Acts authorize Army Corps projects with local cost shares (typically 35 to 50% non-federal, **verify**); SRF appropriations.
