# National municipal and county office research

**Prepared:** 2026-09-22  
**Question:** `local-executive-and-council-rules` in `OPEN-QUESTIONS-2026-09-22T2115Z-9540769a.md`  
**Purpose:** research input for game design and engineering. This is not an approved game profile or a verified census of current local law.

## Findings for a nationwide baseline

The best available broad nationwide empirical source located is ICMA's 2018 Municipal Form of Government Survey, published July 2019. It mailed the survey to 12,761 municipal governments in ICMA's database and received 4,109/4,115 responses (the report's methodology says 4,109, while its population table says 4,115), a 32.2% response rate. Per-question denominators vary. The report states overall standard error +/-1% at 95% confidence, but that does not remove nonresponse or database-coverage bias. These are shares of responding municipalities, not shares of Americans or necessarily all 19,000+ municipal units. The Census's 2022 Census of Governments gives official counts by governmental type and state, but does not classify charter form, mayor selection, terms, party ballot status, qualifications, or election dates.

| Question | Nationwide evidence / usable broad range | Denominator and limit |
|---|---|---|
| Municipal form | 2018 respondent distribution: council-manager 48.2%; mayor-council 38.2%; commission 3.2%; town meeting 8.1%; representative town meeting 2.3%. The two dominant forms comprise 86.4%. | ICMA 2018, n=4,020. For size bands, ICMA reports mayor-council is the most common among respondents under 5,000 residents; council-manager is most common among medium/large respondents. Exact size-band percentages are not published in this summary, so do not invent them. |
| Who is chief elected official? | In ICMA 2018, 58.4% reported a mayor, 24.0% a council president/board chair, and 17.6% both. The mayor label does not prove a separate elected executive. | n=3,808. Town meeting and other forms may have no meaningful mayoral office. |
| Chief official selected how? | Direct election 75.6%; council selects from members 21.3%; top council vote-getter becomes chief 0.9%; rotation 1.6%; other 0.7%. Thus indirect/rotating selection is a material minority, not an edge case. | n=3,802. The survey category is “chief elected official,” not strictly mayors; it includes council presidents/board chairs and some local forms. |
| Chief official term | 1 year 13.5%; 2 years 28.6%; 3 years 6.1%; 4 years 49.4%; other 2.4%. Four years is the most common reported value, but not a universal default. | n=3,793. |
| Chief official term limits | Yes 8.6%; no 91.4%. Among those reporting a limit (n=318), 2 terms 51.1%, 3 terms 26.2%, 4 terms 11.0%, 1 term 3.8%, other 7.9%. Where authority reported (n=314), charter 69.0%, ordinance 15.0%, state law 13.4%, other 2.6%. | Limits are usually absent, and when present are mostly local charter/ordinance rules. The 2016 NLC fact sheet cites older 2006 survey values (9% cities with limits); use 2018 figures as the better-aligned measure. |
| Council size | 5 seats 39.3%; 7 seats 26.1%; 6 seats 12.5%; 4 or fewer 12.0%; 8+ 10.1%. | n=3,910. Includes chief official where they sit on council. |
| Council election method | All at-large 68.0%; all ward/district 18.4%; mixed 13.6%. | n=3,855. |
| Council terms | At-large councilors: 2 years 18.6%, 3 years 13.1%, 4 years 63.6%, 6 years 2.8%, other 1.9%. District councilors: 2 years 24.0%, 3 years 7.6%, 4 years 64.7%, 6 years 2.0%, other 1.8%. | At-large n=3,254; district n=1,296. 80.8% say council terms are staggered (n=3,851). |
| Council term limits | Yes 8.7%; no 91.3%. When limited, mean 2.8 terms, median 2, range 1–12. Limiting authority: charter 69.5%, ordinance 15.7%, state law 12.4%, other 2.4%. | Yes/no n=3,899; term count n=313; authority n=332. |
| Partisan status | Council party labels appeared on general-election ballots in 30.1% of responding municipalities; absent in 69.9%. For “cities” alone, ICMA reports 14.9% yes / 85.1% no in its 2019 Local Government Review article. | Overall n=3,869. The city-only percentage uses a separate category/cross-tab; don't blend it with all municipalities. This measures ballot labels, not candidate ideology or party activity off ballot. |
| Election calendar | No national survey distribution found in the reviewed ICMA summary. Existing state/local election calendars cannot be inferred from the fact that most council terms are 2 or 4 years. | Unknown nationally from this source. Requires legal/current election calendar data at state and municipality level. |
| Candidate qualifications | No empirical or national model code found in the reviewed surveys for minimum age, citizenship, elector/registration status, residence duration, continuous residence, district residence, or when qualification must hold. These are jurisdiction-specific legal predicates. | Unknown nationally. Never make 18, voter registration, or a one-year residency period a universal legal fact on this evidence. |
| Statewide general-law overrides | ICMA asks how a municipality's form was established: 47.3% charter, 26.1% state law, 18.9% ordinance, 1.3% resolution, 1.9% by-law, 2.5% referendum, 2.1% other. It does not identify the state statutes or show that a state fixes a value for every municipality. | n=3,942. **No state-by-state override list is certified in this report.** The 26.1% response is not a percentage of states and is not proof of a state-wide rule applying to all municipalities. |

### Municipality form by size: what is supported

ICMA 2018 reports mayor-council is the most common form in responding places below 5,000 population. Council-manager is the most common among medium-to-large local governments and is concentrated in Southwest and Atlantic Coast states. ICMA's 2011 product advertises comparisons for nine population ranges, but its data attachment was not retrievable during this pass; exact percentages by band remain unknown here. NLC's 2016 primer similarly describes council-manager as especially popular above 10,000, and says council-manager may select a mayor from the council, often by rotation. Use the empirical direction as a weighted sampling clue, not as a deterministic city-size formula.

The historical/alternative forms are substantively distinct: commission members jointly legislate and administer departments; town meeting voters themselves make basic policy and select an implementing board; representative town meeting voters elect representatives who vote in the town meeting. A game locality generated as one of these should not automatically expose a directly elected mayoral contest.

### County executive and governing body

NACo's current county-structure guide says the traditional commission/board form remains the majority pattern; county boards commonly exercise both executive and legislative powers. Board names include commission, council, assembly, fiscal court, levy court commission, county legislature, commissioners' court, and state-specific titles. The site reports about 700 counties with an elected county executive, and approximately 1,300 with an appointed county administrator equivalent; 83 have both. Since NACo separately refers to “over 40 percent” of counties shifting to either the administrator or elected-executive type, do not treat these categories as disjoint or subtract one count from the other to infer a precise traditional-form share.

NACo reports nearly all elected county executives (97%) serve four-year terms; only a handful (8%) have term limits, typically two or three terms. Of counties that elect board members, 53% elect all by district, 29% elect all at-large, and 18% use a mixed plan. These are county-government observations, distinct from city/municipal data. National denominator/coverage: NACo says approximately 700 elected executives; official Census 2022 organization tables provide state and government-unit counts, but those counts must be joined with NACo's definition of county government before computing a final share. Treat ~700 as a count, not a certified 22.3% rate.

An elected county executive is ordinarily countywide and distinct from a board chair selected by the board. In some places a separately titled judge, mayor, chair, or CEO is the elected executive; in other places “county executive officer” is an appointed administrator. A generated “county mayor” should therefore be supported by a local office record, not title matching alone.

## State-law coverage register

The open question asks which states fix local values by general law for all municipalities. That is a more specific claim than whether statewide statutory default rules exist for a class of municipalities. The nationwide survey cannot answer this. No state is marked “verified universal override” below: this means **not audited in this research task**, not that no such law exists.

| Jurisdiction | Universal general-law local-office override found and verified? |
|---|---|
| Alabama | Unknown — state statutes/municipal classes not exhaustively audited. |
| Alaska | Unknown — borough/municipality classes not exhaustively audited. |
| Arizona | Unknown — not exhaustively audited. |
| Arkansas | Unknown — not exhaustively audited. |
| California | Unknown — charter and general-law cities not exhaustively audited. |
| Colorado | Unknown — home-rule/statutory municipalities not exhaustively audited. |
| Connecticut | Unknown — town/city/borough structures not exhaustively audited. |
| Delaware | Unknown — not exhaustively audited. |
| Florida | Unknown — charter and statutory municipalities not exhaustively audited. |
| Georgia | Unknown — municipal charters and general laws not exhaustively audited. |
| Hawaii | Unknown — county consolidation/city equivalents not exhaustively audited. |
| Idaho | Unknown — not exhaustively audited. |
| Illinois | Unknown — municipal classes and home-rule status not exhaustively audited. |
| Indiana | Unknown — city/town classes not exhaustively audited. |
| Iowa | Unknown — city classifications not exhaustively audited. |
| Kansas | Unknown — city classes and forms not exhaustively audited. |
| Kentucky | Unknown — city classes and consolidated/local forms not exhaustively audited. |
| Louisiana | Unknown — municipal classes and forms not exhaustively audited. |
| Maine | Unknown — town/city/plantation forms not exhaustively audited. |
| Maryland | Unknown — municipal charters not exhaustively audited. |
| Massachusetts | Unknown — city charters and town-meeting/by-law rules not exhaustively audited. |
| Michigan | Unknown — city/village/home-rule rules not exhaustively audited. |
| Minnesota | Unknown — statutory city classes and home-rule charters not exhaustively audited. |
| Mississippi | Unknown — municipal forms not exhaustively audited. |
| Missouri | Unknown — municipal classes and charter status not exhaustively audited. |
| Montana | Unknown — city/town classifications not exhaustively audited. |
| Nebraska | Unknown — city/village classes not exhaustively audited. |
| Nevada | Unknown — city/county and municipal charter rules not exhaustively audited. |
| New Hampshire | Unknown — city/town/meeting forms not exhaustively audited. |
| New Jersey | Unknown — optional charter forms and general law not exhaustively audited. |
| New Mexico | Unknown — municipal classes and charter forms not exhaustively audited. |
| New York | Unknown — city/town/village classes and charters not exhaustively audited. |
| North Carolina | Unknown — municipal classes and charter regimes not exhaustively audited. |
| North Dakota | Unknown — city classes not exhaustively audited. |
| Ohio | Unknown — municipal home-rule/constitutional rules not exhaustively audited. |
| Oklahoma | Unknown — municipal classes and charter rules not exhaustively audited. |
| Oregon | Unknown — city charters and general law not exhaustively audited. |
| Pennsylvania | Unknown — municipal classes and optional plans not exhaustively audited. |
| Rhode Island | Unknown — city/town charters not exhaustively audited. |
| South Carolina | Unknown — municipal classes and forms not exhaustively audited. |
| South Dakota | Unknown — municipal classes not exhaustively audited. |
| Tennessee | Unknown — city classes and metropolitan charters not exhaustively audited. |
| Texas | Unknown — city classes and home-rule/general-law rules not exhaustively audited. |
| Utah | Unknown — municipal classes not exhaustively audited. |
| Vermont | Unknown — town/city charters not exhaustively audited. |
| Virginia | Unknown — city/county/town distinctions and Dillon's Rule not exhaustively audited. |
| Washington | Unknown — statutory city classes/optional forms not exhaustively audited. |
| West Virginia | Unknown — municipal classes not exhaustively audited. |
| Wisconsin | Unknown — city/village/town charters not exhaustively audited. |
| Wyoming | Unknown — municipal classes not exhaustively audited. |
| District of Columbia | Not a state/municipality; separate federal district government. City-level mayor and council are locally elected, subject to federal law. A jurisdiction-specific profile is needed. |
| Puerto Rico | Not a state. Its municipal mayors and assemblies need the territory-specific profile; do not fold into the fifty-state general-law matrix. |

This full list is a coverage register so no state silently disappears. It does not satisfy exact state-law verification.

## Design/use implications (research recommendation, not owner approval)

1. Keep two data layers. **Evidence-known local rules** should come from a place charter or applicable state statute and include source/date/scope. **Generated baseline profiles** can draw from national empirical ranges, seeded deterministically per place and persisted as “drawn,” consistent with the owner's standing rule quoted in the research request. Do not store a sampled item as legal fact.
2. For research-bounded calibration, the strongest broad anchors are: council-manager vs mayor-council dominates; mayor-council skews to under-5,000 places; council-manager skews to medium/large; directly elected chief official about three quarters, indirect council-selection about one fifth; 4-year chief and council terms are the mode; mayor/council term limits are uncommon (~9%); nonpartisan council ballots are the majority (~70% overall; ~85% in ICMA's city-only subgroup).
3. The sampling frame does not settle exact place-size distributions, term length for each seat, whether chief election coincides with council election, odd/even-year or spring/fall date, ward residency, minimum age/citizenship/elector criteria, mayor-specific party status, or all-state general-law defaults. Keep these unknown until sourced.
4. A player-facing depth selector can let the player choose “run for mayor/council” without needing to learn the charter taxonomy. Show local-office rules only when relevant to eligibility, filing, ballot, and the authority of the office. For county play, distinguish elected executive, appointed manager, and board chair.

## Sources checked (official or primary institutional sources)

- ICMA, [2018 Municipal Form of Government Survey summary report (PDF)](https://icma.org/sites/default/files/2018%20Municipal%20Form%20of%20Government%20Survey%20Report.pdf), July 2019; underlying mail survey, sample/methodology and all municipal percentages above.
- ICMA, [2018 survey overview and response-rate page](https://icma.org/articles/article/icma-2018-municipal-form-government-survey), confirming all-12,761 database frame and 4,109 returns (page says 32.2%).
- ICMA, [2011 population-range form-statistics page](https://icma.org/documents/form-government-statistics-2011-council-manager-versus-mayor-council-specific-population-ranges), confirms a nine-band comparison exists; attachment was unavailable in this pass.
- NLC, [Forms of Local Government](https://www.nlc.org/resource/cities-101-forms-of-local-government/), Dec. 13, 2016; definitions, trends, qualitative population/geographic pattern, historical 2006 figures. Used for interpretation, not preferred numeric baseline where 2018 ICMA data exists.
- NLC, [Mayor's Term](https://www.nlc.org/resource/mayors-term/), Oct. 21, 2016; older 2006 term/limit data and note that limits vary locally and by state law. Superseded by 2018 ICMA figures above for broad estimates.
- NACo, [County structure, authority and finances](https://www.naco.org/page/county-structure-authority-and-finances), current page accessed 2026-09-22; county board/executive/admin counts, distribution, term length and limits.
- U.S. Census Bureau, [2022 Census of Governments organization tables](https://www.census.gov/data/tables/2022/econ/gus/2022-governments.html); official unit counts by government type/state; the tables do not supply charter/term/election rules.
- NLC, [Population Shifts and Forms of Government](https://www.nlc.org/resource/centennial-brief-resource-collection/population-shifts-and-forms-of-government/), Oct. 21, 2024; contemporary concise forms and their responsibilities.

## Limits and next research step

This answers the national empirical range portion with measured denominators, identifies the sources that support size bands, and leaves the unresolved law conspicuous. It does **not** assert complete fifty-state municipal law, a universal age/residency/elector rule, current calendar dates, or exact size-band percentages. The next factual step, if this question is to become enforceable office-qualification/game data, is a bounded official-source survey of state municipal forms/statutory classes plus representative local charter sampling, followed by state and place specificity for any claimed override.
