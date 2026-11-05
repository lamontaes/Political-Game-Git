# Which government can pass which law, and does the game stop a lower one overruling a higher one?

Written Nov 5, 2026, about 5 p.m. Eastern. Read-only research. Code read from `lamontaes/Political-Game-Git` main at `3f98538` (Nov 5, 4:03 p.m.). Nothing was changed or committed.

## What this means (read this first)

- **The real rule:** federal law beats state law (Supremacy Clause, U.S. Const. art. VI, cl. 2), and a state law beats a town or county law, because towns only have the powers their state gives them. Some laws are a **floor**: lower levels may go higher, never lower (the $7.25 federal minimum wage, anti-discrimination law, the federal handgun age). Others are a **ceiling or a ban**: the state can stop towns from acting at all (most states bar local gun rules, about 33 bar rent control, about 26 to 31 bar local minimum wages).
- **What the game does today:** it gets the minimum wage right everywhere. A town wage in a state that bans them is blocked when drafted and ignored if it already exists; a state wage below $7.25 can pass, but $7.25 still governs, as in real life (Georgia's and Wyoming's $5.15 laws are on the books, and $7.25 applies).
- **What it does not do:** for the 59 other policy laws, a town is only blocked by a list frozen from the 2026 research, so a state can never ban (or un-ban) towns during play. Once a town passes something, nothing ever sets it aside. A local income tax keeps running after the state takes the power away. And nothing checks a state law against federal law: a state can drop the Medicaid work rule even after the federal one starts on Jan. 1, 2027.
- **"Everywhere, not just Mississippi":** I found no Mississippi-only code. The checks look up each place's own state. But they only run for the player's own town and state today. Other towns' councils don't legislate yet, and other states' legislatures are checked against the lists of who may act, never against federal law. Whatever we build has to work the same for every state, county and town.
- **The bill paper's own list of who can act is mostly a placeholder.** 71 of the 87 laws say "state and city" because the build script stamps that on every state question. At least 24 of those are things no city can do (stand your ground, voter ID, bail, the state income tax). Congress can draft only 10 of the 87. Counties aren't a level in the list at all.

Your call, when we get there: a fix touches the law engine for every state at once. The pieces it needs are listed at the end of this note.

---

## Part A. Who can act on each law

### How the levels relate (short version, with sources)

- **Federal over state.** Federal law wins any conflict. It can do this by saying so outright, by covering a whole field (immigration: *Arizona v. United States*, 2012; private-sector unions under the National Labor Relations Act; employer benefit plans under ERISA, 29 U.S.C. 1144; appliance efficiency under EPCA), or by making the state law impossible to obey alongside it. Congress can't order states or sheriffs to enforce federal law (*Printz v. United States*, 1997; *Murphy v. NCAA*, 2018), but it can attach conditions to federal money (*South Dakota v. Dole*, 1987).
- **Federal floors.** Many federal laws say states may go further: the minimum wage (29 U.S.C. 218(a)), family leave (FMLA, 29 U.S.C. 2651(b)), job discrimination (42 U.S.C. 2000e-7), clean air (42 U.S.C. 7416, except car standards, 42 U.S.C. 7543), and tobacco sales rules (21 U.S.C. 387p; the federal age has been 21 since Dec. 2019).
- **State over local.** Towns and counties are creatures of the state. Under **Dillon's Rule** a town has only the powers the state spells out. Under **home rule** it may act on local matters unless the state says otherwise. Home rule doesn't protect a town from preemption: in nearly every home-rule state a state law on a matter of statewide concern still wins.
  - Cities: the National League of Cities counts 31 states applying Dillon's Rule to all municipalities, 8 applying it to some, 10 home-rule states, and Florida as a special case. Virginia is the strictest Dillon's Rule state. Ohio, Texas and California give cities home rule in their constitutions but preempt heavily anyway.
  - Counties: the game already holds NACo's 2022 ratings (`data/research/core/naco-2022-county-authority.json`). No county home-rule option in DE, NC, NE, NM, OK, TX, UT, VA, VT, WV, WY. CT and RI have no county governments.
- **Express preemption is spreading.** The Local Solutions Support Center tracked more than 400 such bills in 2024. Examples:
  - Texas's 2023 HB 2127 (the "Death Star" law) bars city rules in whole fields of state code. A Travis County judge called it unconstitutional in Aug. 2023, without blocking it; the state's appeal hadn't been decided as far as I could find.
  - Florida 2024: HB 601 (police oversight) and HB 433 (local heat and wage rules).
  - Some states even cap local budget lines: Texas HB 1900 (2021) penalizes big cities that cut police budgets, Georgia HB 286 (2021) limits cuts, Florida HB 1 (2021) allows appeals of cuts.
- **Voters.** About 26 states let voters pass laws or amendments directly (Ballotpedia; 21 allow initiated statutes, 18 initiated amendments). Mississippi's initiative process was struck down by its own Supreme Court in 2021. Many laws on this list were passed that way: the minimum wage, Medicaid expansion, cannabis, redistricting commissions, abortion, term limits and felony voting. Many charter cities also have local initiatives.

### The seven patterns

| Pattern | Meaning | Count of the 87 |
|---|---|---|
| FED | Only Congress sets it. | 6 |
| FED-STATE | Federal program; states choose within federal rules (or must follow a federal mandate). | 4 |
| FLOOR | A higher level sets a minimum; lower levels may go higher, never lower. | 8 |
| STATE | The state sets it (voters too, in initiative states); towns can't. Congress may be able to act but hasn't. | 30 |
| LOCAL-OPTION | State or towns may act; towns can, unless their state bars it. | 8 |
| PREEMPT | State or towns could act, but many or most states bar towns by statute. | 6 |
| OWN | Each government sets its own: budgets, own taxes, own workers, own officials. A town's own tax still needs the state's grant. | 25 |

Levels: F = Congress, S = state (legislature or voters), Co = county, Ci = city or town. "Catalog now" is the `levels` field in `src/core2/data/legislature/bill-catalog.json`. A **bold** note means the catalog is wrong.

### All 87 laws

| # | Catalog name | Plain name | Who can act | Pattern | Catalog now | Notes |
|---|---|---|---|---|---|---|
| 1 | budget:highways | Highway spending | F, S, Co, Ci | OWN | S, Ci | F and Co missing. Federal money comes with conditions (*South Dakota v. Dole*). |
| 2 | fare-free-transit | Free bus and train fares | S, Co, Ci (transit agencies) | LOCAL-OPTION | S, Ci | Set by whoever runs the system; no state ban found. |
| 3 | mileage-fee-replaces-fuel-tax | Per-mile road charge instead of a gas tax | F (its own fuel tax; IIJA pilot), S | STATE | S, Ci | **City wrong.** OR, UT, VA, HI run programs. |
| 4 | public-broadband | Town-run internet service | S decides; Co, Ci build | PREEMPT | S, Ci | 16 states ban it, 3 more put up roadblocks (BroadbandNow, May 2024). Congress and the FCC can't override state bans (*Nixon v. Missouri Municipal League*, 2004; *Tennessee v. FCC*, 6th Cir. 2016). |
| 5 | shift-highway-funds-to-transit | Move road money to transit | F (23 U.S.C. 133 flexible funds), S, Co, Ci | OWN | S, Ci | Many state constitutions lock gas-tax money to roads. |
| 6 | law:medicare-tax | Medicare payroll tax | F | FED | F | OK. |
| 7 | law:medicaid-match | Federal share of Medicaid | F | FED | F | OK. Formula in 42 U.S.C. 1396d(b). |
| 8 | expand-medicaid-eligibility | Medicaid expansion | F sets terms, S chooses | FED-STATE | S, Ci | **City wrong.** Optional since *NFIB v. Sebelius* (2012); 40 states and DC have expanded, 7 of them by ballot (ID, ME, MO, NE, OK, SD, UT). |
| 9 | medicaid-work-requirement | Medicaid work rule | F mandates it from Jan. 1, 2027 for expansion adults (P.L. 119-21 § 71119); S may start sooner | FED-STATE (federal floor) | S, Ci | **City wrong, F missing.** A state can't repeal it after 2027. See Part B. |
| 10 | work-requirement-for-assistance | Work rule for food aid | F (SNAP, P.L. 119-21 § 10101); S runs it with narrow waivers; counties run it in some states | FED-STATE | S, Ci | **F missing.** The research has only a U.S. answer. |
| 11 | budget:healthAndHospitals | Health and hospital spending | F, S, Co, Ci | OWN | S, Ci | Counties run most public hospitals; Co missing. |
| 12 | universal-preschool | Free preschool for all | S, Co, Ci or school districts; F funds Head Start | LOCAL-OPTION | S, Ci | Cities do it (NYC, Denver, Seattle). `question-powers.json` says state only, so a city's bill is blocked. |
| 13 | budget:schools | K-12 school spending | F (Title I, IDEA), S, school districts | OWN | S, Ci | School districts are separate governments in most states. |
| 14 | public-funds-for-private-schooling | Vouchers and education savings accounts | S; F tax-credit scholarships from 2027, states opt in (P.L. 119-21) | STATE | S, Ci | **City wrong.** A state that funds private schools can't leave out religious ones (*Carson v. Makin*, 2022). |
| 15 | raise-teacher-minimum-salary | State floor on teacher pay | S floor; districts pay above it | FLOOR (state floor) | S, Ci | "City" should be the school district. |
| 16 | budget:higherEducation | College spending | F (Pell grants), S, Co (community colleges) | OWN | S, Ci | |
| 17 | law:income-tax | Income tax rate | F, S; Co and Ci only where the state allows (16 states) | OWN (local needs a state grant) | **Ci only** | **Congress and legislatures can't change their own income tax rate from the bill paper** (`scripts/research/build-bill-catalog.py` line 96). |
| 18 | law:sales-tax | Sales tax rate | S; Co and Ci where allowed (38 states have local sales taxes) | OWN (local needs a state grant) | **Ci only** | **State missing.** There is no federal sales tax. |
| 19 | law:property-tax | Property tax rate | Co, Ci, school and special districts, a few states; F barred | OWN, under state caps | S, Ci | Co missing. State assessment caps are applied to tax bills (`src/core2/housing-property-tax.ts`). |
| 20 | law:corporate-income-tax | Corporate income tax | F, S (44 states); a few cities where allowed (NYC, Philadelphia, Detroit, Ohio cities, the Portland area) | OWN | F, S | OK; the local version is left out. |
| 21 | law:estate-tax | Estate tax | F, S (12 states and DC) | OWN | F, S | OK. |
| 22 | law:inheritance-tax | Inheritance tax | S (KY, MD, NE, NJ, PA) | STATE | S | OK. Iowa's ended in 2025. Nebraska's is collected by counties at state-set rates. |
| 23 | law:local-income-tax-authority | Lets towns tax income | S | STATE | S | OK. |
| 24 | adopt-income-tax | Have a state income tax | F (16th Amendment), S | STATE | S, Ci | **City wrong.** The local income tax is rows 17 and 23. |
| 25 | cap-property-tax-growth | Cap on property tax growth | S (often voters: Prop 13, Prop 2½, TABOR) | STATE (a ceiling on towns) | S, Ci | **City wrong.** |
| 26 | exempt-groceries-from-sales-tax | No sales tax on groceries | S; Co and Ci where the local tax base is their own (AL, AR, CO home-rule cities, IL from 2026, MO, OK, UT) | LOCAL-OPTION | S, Ci | Co missing. |
| 27 | graduated-income-tax | Higher rates on higher incomes | F (already graduated), S | STATE | S, Ci | **City wrong.** The IL, MI and PA constitutions require a flat rate. |
| 28 | balanced-operating-budget | Must balance its budget | Each government for itself; state law binds its towns | OWN | S, Ci | F and Co missing. 49 states have some rule; Vermont doesn't. |
| 29 | fund-pensions-to-schedule | Pay into pensions on schedule | Each for its own plan; states can bind local plans | OWN | S, Ci | |
| 30 | minimum-reserve-balance | Rainy-day reserve rule | Each for itself | OWN | S, Ci | |
| 31 | law:snap-maximum | Top SNAP benefit | F | FED | F | OK. States pay part of benefit costs from 2028 (P.L. 119-21) but can't change the amount. |
| 32 | budget:welfareAndMedicaid | Welfare and Medicaid spending | F, S, Co (some states make counties pay a share, e.g., NY) | OWN | S, Ci | |
| 33 | law:federal-unemployment-tax | Federal unemployment tax | F | FED | F | OK. |
| 34 | law:state-unemployment-tax | State unemployment tax | S, within federal minimums (taxable wages at least $7,000; 26 U.S.C. 3302, 3304) | FLOOR | S | OK. |
| 35 | law:unemployment-weekly-maximum | Top weekly jobless benefit | S | STATE | S | OK. |
| 36 | law:social-security-tax | Social Security payroll tax | F | FED | F | OK. |
| 37 | allow-multifamily-in-single-family-zones | Duplexes and small apartments on house lots | Ci and Co zoning; S can require it (OR 2019, CA 2021, ME 2022, WA, MT and VT 2023, AZ 2024) | LOCAL-OPTION, with a state override | S, Ci | Co missing. A state mandate sets a floor on what towns must allow. |
| 38 | budget:housing | Housing spending | F (HUD), S, Co, Ci | OWN | S, Ci | |
| 39 | inclusionary-requirement | Builders must include affordable homes | Ci, Co unless barred; S | PREEMPT (about 11 states bar it) | S, Ci | Some states require it instead (NJ's Mount Laurel rulings, MA Chapter 40B). |
| 40 | rent-stabilization | Rent control | S (OR, CA, WA statewide caps; DC); Ci and Co where allowed (NY, NJ, MD, MN, ME; CA within Costa-Hawkins) | PREEMPT (about 32 to 36 states) | S, Ci | Co missing (Montgomery and Prince George's counties in Maryland have it). |
| 41 | right-to-counsel-in-eviction | Free lawyer in eviction cases | Ci (NYC, SF, Newark, Cleveland, Philadelphia and others), S (WA, MD, CT and others) | LOCAL-OPTION | S, Ci | No state ban found. |
| 42 | law:minimum-wage | Minimum wage | F floor of $7.25; S higher; Ci and Co higher only where the state allows | FLOOR | F, S, Ci | Co missing (Montgomery County MD, Cook County IL, unincorporated LA County). |
| 43 | raise-federal-minimum-wage | Raise the federal minimum | F | FED | F | OK. |
| 44 | local-minimum-wage-authority | Lets towns set a higher wage | S | STATE | S, Ci | **City wrong**; both other level lists say state only. |
| 45 | raise-minimum-wage | Raise the state minimum | S (often voters: AK, AZ, CO, FL, MO, NE, NV) | FLOOR | S, Ci | The "city" entry duplicates row 42. |
| 46 | paid-family-leave | Paid family leave insurance | S (13 states and DC); F has an unpaid floor (FMLA); a city top-up is rare (SF) | FLOOR, with towns preempted in about 18 states | S, Ci | The research flags no state as barring towns, but about 18 states bar local paid leave. |
| 47 | public-sector-collective-bargaining | Union rights for public workers | S (for state and local workers); Ci and Co by charter where the state is silent; F none (the NLRA excludes governments) | STATE | S, Ci | |
| 48 | right-to-work | Right-to-work | S (29 U.S.C. 164(b)); F could repeal that section; local laws mostly barred (*Lincolnshire*, 7th Cir. 2018; *Hardin County*, 6th Cir. 2016, allowed one) | STATE | S, Ci | **City wrong, F missing.** 26 states; Michigan repealed in 2024. |
| 49 | legalize-cannabis-sales | Legal cannabis stores | S (24 states plus DC allow adult use); federal law still bans adult use, and only state-licensed medical moved to Schedule III (April 2026); Ci and Co may refuse stores in most legal states | STATE, with a one-way local opt-out | S, Ci | A town can say no to stores, never yes where its state bans them. |
| 50 | cap-consumer-loan-rates | Interest-rate cap on loans | S; F limits it (36% for service members, 10 U.S.C. 987; national banks charge their home state's rates, 12 U.S.C. 85) | STATE | S, Ci | **City wrong, F missing.** Some Texas cities regulate payday loan terms, never rates. |
| 51 | ban-new-gas-hookups | No gas in new buildings | S (New York, 2023); Ci and Co where allowed; F's EPCA struck Berkeley's ban (9th Cir. 2024) | PREEMPT (about 24 to 25 states bar town bans) | S, Ci | Co missing. |
| 52 | clean-electricity-standard | Clean power requirement for utilities | S (about 29 states and DC); F possible | STATE | S, Ci | A city can do this only for its own utility. |
| 53 | clean-air-plan-for-polluted-counties | Clean-air plan for polluted areas | F sets standards and approves (Clean Air Act § 110); S writes the plan; regional air districts where the state hands it down | FED-STATE | S, Ci | **F missing.** Air districts are county or regional, not city. |
| 54 | budget:naturalResources | Natural resources spending | F, S, Co, Ci | OWN | S, Ci | |
| 55 | bottle-deposit | Bottle deposit | S (CA, CT, HI, IA, ME, MA, MI, NY, OR, VT; Guam) | STATE | S, Ci | **City wrong**; no city has one, and many states bar local container rules. `question-powers.json` lists county and city too. |
| 56 | price-carbon | Carbon price | S (CA and WA cap-and-trade; the RGGI states); F possible | STATE | S, Ci | **City wrong, F missing.** |
| 57 | budget:police | Police spending | F grants, S, Co (sheriffs), Ci | OWN, but some states cap local cuts (TX, GA, FL) | S, Ci | Even a budget line can be preempted. |
| 58 | civilian-oversight-of-police | Civilian police review board | Ci, Co; S may limit it (FL HB 601, 2024; TN SB 591, 2023; AZ, 2021) | LOCAL-OPTION, with some state bans | S, Ci | |
| 59 | partner-with-federal-immigration-enforcement | Local police working with ICE | F can't force it; S may require it (TX, FL and about 15 more) or forbid it (CA, IL, WA, OR, NJ, NY, CO and others); sheriffs and cities decide where the state is silent | PREEMPT (both ways) | S, Ci | **Co missing**; sheriffs are the main actors. |
| 60 | end-cash-bail | End cash bail | S (statute and court rules: NJ 2017, IL 2023) | STATE | S, Ci | **City wrong.** |
| 61 | budget:corrections | Prison and jail spending | F, S (prisons), Co (jails) | OWN | S, Ci | Co missing. |
| 62 | restore-voting-after-sentence | Voting rights after a sentence | S (often voters: Florida, 2018) | STATE | S, Ci | **City wrong.** |
| 63 | raise-juvenile-court-age | Raise the juvenile court age | S | STATE | S, Ci | **City wrong.** |
| 64 | child-access-prevention | Safe-storage and child-access gun rules | S (about half the states); Ci and Co only in the 7 states without broad gun preemption | PREEMPT (43 states) | S, Ci | |
| 65 | permit-to-carry-concealed | Permit to carry a hidden gun | S (29 states need no permit); F floor: *Bruen* (2022) ended discretionary permits | STATE (towns preempted) | S, Ci | **City wrong.** |
| 66 | raise-handgun-purchase-age | Raise the handgun buying age | F floor: 21 at licensed dealers (18 U.S.C. 922(b)(1); split in the courts in 2025); S may go higher; towns preempted in 43 states | FLOOR | S, Ci | **F missing.** |
| 67 | stand-your-ground | Stand your ground | S | STATE | S, Ci | **City wrong.** |
| 68 | budget:fire | Fire and ambulance spending | S, Co, Ci, fire districts | OWN | S, Ci | |
| 69 | all-mail-voting | Mail every voter a ballot | S (8 states and DC); a few states let counties choose | STATE | S, Ci | **City wrong**; the local choice is a county one. |
| 70 | automatic-voter-registration | Automatic voter registration | S (about 24 and DC); F floor: motor-voter (52 U.S.C. 20504); Congress could go further for federal elections | FLOOR | S, Ci | **City wrong, F missing.** |
| 71 | independent-redistricting | Independent redistricting commission | S (often voters: CA, MI, AZ, CO); F could (2 U.S.C. 2c) | STATE | S, Ci | The city entry is really a different law (the council-districts question). |
| 72 | require-photo-id-to-vote | Photo ID to vote | S; F floor: HAVA ID for new mail registrants; Congress could act | STATE | S, Ci | **City wrong.** |
| 73 | same-day-voter-registration | Register on Election Day | S (about 22 and DC) | STATE | S, Ci | **City wrong.** |
| 74 | ban-lobbying-after-office | Lobbying ban after leaving office | Each for its own officials: F (18 U.S.C. 207), S, Co, Ci | OWN | S, Ci | F missing. |
| 75 | law:public-pay-floor | Lowest pay for public workers | Each for its own workers | OWN | F, S, Ci | Co missing. |
| 76 | budget:administration | Administration spending | Each | OWN | S, Ci | |
| 77 | broaden-local-authority | Home rule for towns | S (constitution or statute) | STATE | S, Ci | **City wrong.** |
| 78 | legislative-term-limits | Term limits for legislators | S (16 states, mostly by voters); no state can limit Congress (*U.S. Term Limits v. Thornton*, 1995) | STATE | S, Ci | The city entry is really a different law (council term limits). |
| 79 | ban-discrimination-in-housing-and-work | Anti-discrimination law | F floor (Title VII, the Fair Housing Act, *Bostock*, 2020); S broader; Ci and Co broader unless barred (AR 2015, TN 2011) | FLOOR | S, Ci | **F missing.** |
| 80 | dedicated-parks-funding | Set-aside money for parks | Each | OWN | S, Ci | Co missing. |
| 81 | restrict-abortion | Abortion limits | S (since *Dobbs*, 2022; voters in several states); F could act (contested), and the FDA rules on pills; local only in a few Texas towns | STATE | S, Ci | **F missing.** |
| 82 | age-verification-for-social-media | Age checks for social media | S (many laws, several blocked on free-speech grounds); F (COPPA's under-13 rules) | STATE | S, Ci | **City wrong, F missing.** |
| 83 | restrict-government-facial-recognition | Limits on government face recognition | Each for its own agencies (SF 2019, Boston, Portland); S can limit local police (VT, ME, MT) | OWN, and the state can limit it | S, Ci | `question-powers.json` says state only, so a city's bill is blocked. |
| 84 | consumer-data-privacy-law | Consumer data privacy law | S (about 19 to 20 states); F sector laws (HIPAA, GLBA, COPPA); a federal law would likely preempt the states | STATE | S, Ci | **City wrong, F missing.** |
| 85 | limit-groundwater-withdrawal | Limit groundwater pumping | S water law; local districts (Texas groundwater districts, Nebraska natural resources districts, California agencies under SGMA 2014); counties | LOCAL-OPTION | S, Ci | Should be county or district, not city. |
| 86 | protect-farmland-from-development | Protect farmland | S programs; county zoning; F easement money; state right-to-farm laws limit local rules | LOCAL-OPTION | S, Ci | Co missing. |
| 87 | budget:parks | Parks spending | F, S, Co, Ci | OWN | S, Ci | |

**Catalog tally:**
- 24 entries give a city power no city has (marked "City wrong"). About 7 more use "city" for what is really a school district, an air or water district, a county, or a different law.
- About 13 leave out Congress where Congress really acts or sets a floor.
- Every entry leaves out counties, because the catalog has no county level (`src/core2/bill-catalog.ts` line 23).
- Congress can draft only 10 of the 87.
- Neither Congress nor a legislature can change its own income or sales tax rate.

### Which states bar towns: the big ones

Two-letter codes. "Game" means the starting research the code reads (`data/research/laws/starting-law-2026/*.json`, the `preempts` flag; for the minimum wage, the `local-minimum-wage-authority` rows built from it). Outside counts differ by method, so ranges are honest.

| Policy | States that bar towns (outside source) | What the game has | Mismatch |
|---|---|---|---|
| Local minimum wage | About 25 to 27 states (NELP 2019: 25; Pew 2021). The repo's own statute list (`data/research/laws/local-starting-law/local-minimum-wage.json`) has 26: AL AR FL GA ID IN IA KS KY LA MI MS MO NC OH OK PA RI SC TN TX UT WI OR NY VA | 31 barred: the 26 plus MT ND NH NV VT. No power but not flagged: CT DE HI MA NJ WV WY. Allowed in 13: AK AZ CA CO DC IL MD ME MN NE NM SD WA | **The repo's two lists disagree on MT, ND, NH, NV, VT.** Towns really have their own wages in AZ CA CO IL MD ME MN NM WA (the repo's 71-place list). The EPI tracker refused automated reads, so I couldn't check it. |
| Rent control | 33 states (LSSC): AL AZ AR CA CO CT FL GA ID IL IN IA KS KY LA MA MI MN MS MO MT NM NC ND OH OK OR SC SD TN TX UT WA WI. Add NE (LB 266, April 7, 2025). NAA (Fall 2025) counts 32 that bar towns and have no state rent control | 34 barred: AL AR AZ CO FL GA IA ID IL IN KS KY LA MA MI MO MS MT NC ND NE NH NM OH OK PA SC SD TN TX UT VA WI WV | The game doesn't bar towns in **OR or WA** (both have statewide caps; Oregon still bars local rent control, ORS 91.225, and Washington's preemption statute RCW 35.21.830 is still on the books as far as I could see). CA (Costa-Hawkins), MN (needs voter approval) and CT are partial. The game adds NH, PA, VA, WV, which LSSC doesn't list. |
| Local gun rules | 43 states broadly bar them (Giffords). No preemption statute: CT, HI, MA, NJ, NY. Limited: CA, CO (2021 repeal) | Child-access, purchase-age and stand-your-ground are flagged barred in **all 56**. Permit-to-carry is flagged in **none** | **Wrong both ways.** It should bar towns everywhere except CT HI MA NJ NY (and partly CA, CO). Permit-to-carry is also listed as state-only, so towns are blocked anyway. |
| Local income tax | Allowed in 16 states: AL CO DE IN IA KS KY MD MI MO NJ NY OH OR PA WV (Tax Foundation 2023 primer, per the repo). Barred or never granted everywhere else | Same 16 | Matches. But taking the power away in play doesn't end taxes towns already levy (Part B). |
| Paid sick or family leave | About 18 states bar local paid sick leave: AL AR FL GA IN IA KS KY LA MS MO NC OH OK SC TN TX WI. MD, MI, NJ and OR occupy the field through their state laws. EPI counts 23 with some paid-leave preemption | None flagged | **Missing.** |
| Plastic bags | 20 states (PlasticBagLaws.org, July 2026, from Surfrider data): AZ AR FL ID IN IA MI MS MO MT NE NC ND OH OK SD TN TX WV WI. MN bars bans but allows fees. CO repealed its bar; PA's expired | Not in the catalog | No such law in the game. |
| Bottle deposits | No state lets towns run one; many states' container laws bar local rules. Deposit states: CA CT HI IA ME MA MI NY OR VT (and Guam) | The 10 match. Barred flagged in all 56 | OK. |
| Cannabis | No town may allow sales its state bans. Most of the 24 legal states let towns refuse stores. Federal law still bans adult use | Barred flagged in none | **Missing the one-way rule.** The level list stops towns anyway, so a town can never opt out either. |
| Tobacco | Federal law keeps state and local sales rules alive (21 U.S.C. 387p). Many states bar local tobacco rules. I couldn't get a sourced 2025 state list (the CDC STATE System and Public Health Law Center maps refused automated reads) | Not in the catalog | No such law in the game. |
| Town-run internet | 16 explicit bans: AL FL LA MT MI MO NE NV NC PA SC TN TX UT VA WI. Roadblocks in IA, OR, WY. Repealed: CO (2023), MN (2024), and earlier WA and AR (BroadbandNow, May 2024) | 19 barred: AL FL IA LA MI MO MT NC NE NH NV PA PR SC TN TX UT VA WI | Close. NH and PR need a check. |
| Inclusionary zoning | 11 states (LSSC): AZ CO FL ID IN KS MT TN TX VA WI. Colorado's 2021 HB21-1117 restored local rental rules, so CO may be stale | 7 barred: AZ IN KS MT TN TX WI | The game lacks FL, ID, VA (partial bans). |
| Sanctuary and ICE cooperation | Bar sanctuary policies: AL AZ AR FL GA IN IA KS MS MO MT NH (from 2026) NC ND SC TN TX, plus LA and WV by other counts. Limit cooperation statewide: CA CO CT IL MA (court ruling) NJ NM NY OR RI VT WA, plus DC. The Justice Department's list (Oct. 31, 2025) names CA CO CT DE DC IL MN NY OR RI VT WA | 16 barred: CA CT DC DE FL GA IL MD ME NJ NM NY OR TN TX WA | **Incomplete**: missing about 13 anti-sanctuary states and CO, RI, VT, MA. |
| Police oversight | FL (HB 601, signed April 12, 2024: boards can't investigate), TN (SB 591, May 2023: Memphis and Nashville boards replaced), AZ (2021: rules on who sits on boards) | 5 barred: AZ FL IA NJ TN | IA and NJ need a check. New Jersey's limit came from a 2023 state Supreme Court ruling, not a statute. |
| Bans on gas hookups | About 24 to 25 states bar town bans (S&P 2023: at least 24). Arizona was first (2020), then UT, AR, OK, AL, TX, KY, KS, OH, WY and others. Federal EPCA also struck Berkeley's ban (9th Cir. 2024) | 27 barred: AL AR AZ FL GA IA ID IN KS KY LA ME MO MS MT NC ND NE NH OH OK SD TN TX UT WV WY | Close. **Maine** looks wrong: I know of no Maine ban on town gas rules. |

---

## Part B. Does the game enforce it?

### Where the levels live (three lists that disagree)

1. `src/core2/data/legislature/bill-catalog.json`, built by `scripts/research/build-bill-catalog.py`. This list decides what a body sees on the bill paper (`src/core2/bill-catalog.ts` line 77).
   - Every state question gets `["state","city"]` (build script line 147).
   - Every budget line gets the same (line 130).
   - The income and sales tax get `["city"]` only (lines 96 and 97).
   - There's no county level (`bill-catalog.ts` line 23).
2. `src/core2/data/legislature/series-powers.json` (federal, state or local, with citations). It's read by `beyondPower` (`src/core2/modules/legislature.ts` lines 1645 to 1662) for law amounts, and by other governments' sittings (`src/core2/modules/world-legislating.ts` line 175).
3. `data/research/powers-catalog/question-powers.json` plus `catalog.json` (the levels and the "dial" cells). They're read by `policyAuthority` (`src/core2/policy-authority.ts` line 105) for the policy questions.

They disagree often:
- Consumer loan caps: federal and state in list 2; state and city in list 1; state only in list 3.
- Universal preschool and facial recognition: list 3 says state only, so a city's bill shows on the menu and is then blocked.
- Bottle deposits: list 3 gives county and city.

### What is checked when a bill is drafted

All of this is `checkedText`, `src/core2/modules/legislature.ts` lines 2365 to 2440.

- **Policy questions** go to `policyAuthority` (`src/core2/policy-authority.ts` lines 67 to 187):
  - The body's level must be in list 3 (line 105).
  - A "no" cell blocks it (line 123).
  - For a county or city:
    - The state's `preempts` flag in the 2026 research file blocks it (lines 125 to 132).
    - A gate question is read from the law in force (lines 133 to 143).
    - Unknown cells defer to the state's home-rule law in force (lines 144 to 158).
    - Counties are checked against the NACo ratings (lines 164 to 182).
- **Law amounts** go to `beyondPower` (list 2) first. Then:
  - A state or federal body is "within its own power" with no further check (lines 2375 to 2387).
  - A town goes to `authorityFor` (lines 1504 to 1581):
    - The minimum wage needs the state's grant in force (lines 1507 to 1534).
    - The local income tax needs the state's grant row at 1; the sales tax needs only that the state has local sales tax rows (lines 1536 to 1570).
- **Budget lines:** no check at any level (`authorityFor` falls through to "no-state-limit", line 1577).
- **The menu** (`bill-catalog.ts` lines 93 to 101) computes authority only for a city. State and federal entries are always shown as allowed.

### What applies once laws exist

This is `resolveLawInForce`, `src/core2/laws-in-force.ts` lines 246 to 384.

- **Minimum wage (the "floor" rule): correct.**
  - A town's wage is set aside when the state bars towns or gives them no power (lines 309 to 324).
  - The higher of the federal and state wage governs, and a town's wage counts only if it is higher still (`src/rules/laws/minimum-wage-setting.ts` lines 15 to 17).
  - So a **state wage below $7.25 can pass, and $7.25 still governs**. That's true to real law, but the bill paper gives no warning.
- **Income, sales and corporate tax (the "additive" rule):** every level's tax is added together (lines 350 to 366). **The state's grant isn't re-read.** A town's income tax keeps being charged after the state withdraws the power.
- **Everything else, including all 59 policy questions (the "single" rule):** the most local row wins (line 368: `[...levels].reverse().find(...)`). `yesLevels` (`src/core2/modules/laws.ts` lines 573 to 599) says plainly: "A higher level saying no doesn't undo a lower level's yes."
  - That's right when the state just has no law of its own.
  - It's **wrong when the state bars towns**: a town's rule is never set aside.

### What's missing (plainly)

1. **Town preemption is frozen at the start.** `policyAuthority` reads the 2026 research's `preempts` flag (`policy-authority.ts` line 126), not the law in force. A state bill can't add or lift a preemption: the rows `enactLaw` writes (`modules/laws.ts` lines 662 to 754) carry no `preempts` field. Only three powers can change in play: towns' minimum wage, towns' income tax, and home rule.
2. **Nothing is set aside afterward**, except a town's minimum wage. A town's rent control, gun rule or gas ban passed before a state ban stays in force forever. A local income tax outlives the state's withdrawal.
3. **No federal-over-state check** except the minimum wage.
   - Concrete case: Medicaid's work rule. The federal "yes" (operative Jan. 1, 2027) is loaded only when a state has no answer of its own (`modules/laws.ts` lines 215 to 221). In the roughly 51 places that answer "no", the federal mandate never takes effect, and a legislature can repeal the rule freely.
   - The same gap exists for the federal floors in rows 66, 70 and 79 and for federal bans (cannabis).
   - State ballot measures go straight into law (`src/core2/modules/ballot-measures.ts` line 278) with no check.
4. **Congress can't preempt.** It sees 10 of the 87 laws, and no federal law it passes sets aside conflicting state law (no national privacy law, no right-to-work repeal, no gun or voting law).
5. **Counties are folded into towns.** `billLevel` maps a county body to "city" (`legislature.ts` lines 1455 to 1459). The catalog has no county level.
6. **Only the player's own place is checked.**
   - `policyAuthority` and `authorityFor` read `lawChain(api).stateKey`, the player's state (`policy-authority.ts` line 72; `legislature.ts` line 1505).
   - Other states' legislatures get only the who-may-act lists (`world-legislating.ts` lines 164 to 177 and 1122), never a check against federal law.
   - Other towns don't legislate yet (U4). When they do, they'll be checked against the player's state unless this changes.
7. **The research flags are uneven** (table above): guns are barred in all 56 places, paid leave in none, cannabis isn't one-way, sanctuary is half-listed, and OR and WA rent control aren't barred.

### What a fix would need (for every state, county and town at once)

1. **One list of who may act**, with county included, built from the research. The three lists above get merged, and the build script stops stamping "state and city" on everything. Each law gets its pattern from this note (FED, FED-STATE, FLOOR, STATE, LOCAL-OPTION, PREEMPT, OWN).
2. **Preemption as a law, not a research flag.** Each state's bar on towns for each law becomes a dated law row, loaded at the start from the corrected research. A state bill can enact or repeal it (a new "bar towns / allow towns" operation on the bill paper), and `policyAuthority` reads it from the law in force.
3. **One precedence rule applied when laws take effect,** by pattern:
   - floor: the highest governs;
   - preempted: lower rows are set aside while the higher bar is in force, and come back if it's lifted;
   - own: no interaction;
   - additive taxes: a local tax is set aside when the state's grant ends.
   The same rule covers federal over state.
4. **Federal mandates always loaded** where federal law binds (the Medicaid work rule from 2027, SNAP work rules). A conflicting state row is then blocked when drafted and set aside when it takes effect.
5. **The same check for every body**, with no automatic "within its own power" for states (`legislature.ts` lines 2375 to 2387; `bill-catalog.ts` lines 93 to 101). The bill paper should warn when a state wage is below the federal floor.
6. **Each body checked against its own state and county,** not the player's chain, so other states and, later, other towns follow the same rules.
7. **Tests on random places, not one state:**
   - a town wage in a barring state is blocked and set aside;
   - a $5 state wage leaves $7.25 in force;
   - a town rent rule is set aside the day its state bars towns, and returns when the bar is repealed;
   - a state's repeal of the Medicaid work rule has no effect after Jan. 1, 2027;
   - a local income tax stops when the state withdraws the power.
8. **Research clean-up** for the mismatches in the big-ones table.

---

## Sources

Outside:
- Giffords Law Center, "Preemption of Local Laws" (43 states; CT, HI, MA, NJ, NY none; CA, CO limited): https://giffords.org/lawcenter/gun-laws/policy-areas/other-laws-policies/preemption-of-local-laws/
- Local Solutions Support Center, "State Preemption of Local Equitable Housing Policies" (rent control 33, inclusionary zoning 11): https://www.supportdemocracy.org/equitablehousing ; LSSC strategy report, Jan. 2025 (400+ preemption bills in 2024): https://static1.squarespace.com/static/5ce4377caeb1ce00013a02fd/t/67983da941b5287ab6c91f73/1738030511018/LSSC-WinningStrategiesforCombatingAbusivePreemption.pdf
- National Apartment Association, "Rent Control Outlook: Fall 2025": https://naahq.org/news/naas-rent-control-outlook-fall-2025 ; Nebraska LB 266 (2025): https://www.nebraskalegislature.gov/FloorDocs/109/PDF/Slip/LB266.pdf
- PlasticBagLaws.org preemption page (20 states, July 2026): https://www.plasticbaglaws.org/preemption/
- BroadbandNow, "Municipal Broadband Remains Roadblocked In 16 States" (May 14, 2024): https://broadbandnow.com/report/municipal-broadband-roadblocks
- Wikipedia, "Sick leave in the United States" (18 states preempt local paid sick leave): https://en.wikipedia.org/wiki/Sick_leave_in_the_United_States ; EPI chart, 23 states with paid-leave preemption: https://www.epi.org/chart/map-paid-leave-preemption-23-states-have-passed-paid-leave-preemption-laws-prohibiting-cities-and-counties-from-requiring-local-employers-to-offer-paid-sick-leave/
- EPI preemption map (refused automated reads): https://www.epi.org/preemption-map/ ; Pew, Mar. 2021: https://www.pewresearch.org/short-reads/2021/03/12/when-it-comes-to-raising-the-minimum-wage-most-of-the-action-is-in-cities-and-states-not-congress/
- Wikipedia, "Home rule in the United States" (NLC counts 31/8/10 plus FL; NACo county table): https://en.wikipedia.org/wiki/Home_rule_in_the_United_States
- Wikipedia, "Sanctuary city" (anti-sanctuary and sanctuary state laws): https://en.wikipedia.org/wiki/Sanctuary_city ; U.S. DOJ sanctuary jurisdiction list (updated Oct. 31, 2025): https://www.justice.gov/ag/us-sanctuary-jurisdiction-list-following-executive-order-14287-protecting-american-communities
- Florida HB 601 (2024) coverage: https://www.fox13news.com/news/desantis-signs-bill-blocking-civilian-review-boards-from-investigating-law-enforcement-in-florida ; https://flsenate.gov/Committees/BillSummaries/2024/html/601
- Gas-ban preemption counts: S&P Global (2023): https://www.spglobal.com/market-intelligence/en/news-insights/articles/2023/6/half-of-us-states-are-on-pace-to-prohibit-local-gas-bans-76245300 ; Columbia Sabin Center (2021): https://blogs.law.columbia.edu/climatechange/2021/09/09/states-prohibiting-natural-gas-bans-feign-concern-for-energy-choice/ ; CleanTechnica on the Berkeley EPCA ruling (Jan. 2026): https://cleantechnica.com/2026/01/12/the-long-us-goodbye-to-new-gas-connections-and-the-legal-tools-states-are-using-to-get-there/
- Ballotpedia, states with initiative or referendum: https://ballotpedia.org/States_with_initiative_or_referendum
- Cannabis rescheduling (April 2026 order; broader rule pending): https://www.morganlewis.com/pubs/2026/09/high-time-for-a-change-post-dea-hearing-broader-marijuana-rescheduling-questions-remain
- Texas HB 2127 ruling (Aug. 2023): https://billboardinsider.com/rothfelder-on-ruling-that-hb-2127-is-unconstitutional/
- Statutes and cases are cited inline (U.S. Code sections, P.L. 119-21, Supreme Court cases). They're from my own knowledge, not fetched today.

In the repo (main at `3f98538`):
- `src/core2/data/legislature/bill-catalog.json`, `scripts/research/build-bill-catalog.py`, `src/core2/bill-catalog.ts`
- `src/core2/data/legislature/series-powers.json`, `data/research/powers-catalog/question-powers.json`, `data/research/powers-catalog/catalog.json`, `data/research/core/naco-2022-county-authority.json`
- `src/core2/policy-authority.ts`, `src/core2/modules/legislature.ts`, `src/core2/modules/laws.ts`, `src/core2/laws-in-force.ts`, `src/rules/laws/minimum-wage-setting.ts`, `src/core2/laws-bill-values.ts`, `src/core2/modules/world-legislating.ts`, `src/core2/modules/ballot-measures.ts`
- `data/research/laws/starting-law-2026/*.json` (59 questions, 56 places), `data/research/laws/local-starting-law/local-minimum-wage.json`, `local-income-tax.json`, `src/core2/data/laws/starting-law.json`
