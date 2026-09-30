# Housing tenancy and preemption research increment

This increment supplies four legislative decisions across two housing topics. It records actual authority and starting-law evidence where found, and leaves unknown cells explicit. The full housing area remains incomplete. The finished increment can be reviewed and merged under the CTO dispatch while later research continues.

## MERGED

Nothing merged by Team 6. No game code changed, and no watched world was run. Transportation PR1133 is ready at `2ded074f7975b950b4cda1e25794890e4002b889`; this housing increment uses its research schema and validator. The housing publication has its own branch and two research files.

## WHAT EMERGED

Four decisions are admitted: annual rent limits, just-cause eviction, eviction counsel, and state limits on local rent regulation. All cite enacted or voter-considered measures in the required period. Two topic keys and existing rent-rules/local-preemption dials match the inspected catalogs. Federal civil-rights protection is a separate floor, not a local rent-setting grant.

Measured availability: seven cells have source references; 217 of 224 remain unresearched. Every decision also has January 2026 starting-law cells for all 56 places. A state entry is bounded to its recorded actor, property and tenancy scope; NYC does not establish a statewide entitlement.

Oregon's published 2026 standard ceiling is 9.5%, with a distinct 6% rule for manufactured-dwelling/marina facilities over thirty spaces. California retains a CPI-dependent formula, valid stricter local rules, exemptions and vacancy reset. Its just-cause provisions separately constrain owner move-in and substantial remodel. Statutory ceilings limit permitted charges; they do not prove all landlords raise rents to the ceiling.

NYC Local Law20/2023 expands full-representation eligibility to age60+ or income at most200% of federal poverty guidelines, subject to the program's appropriation and service provisions. The certified law controls over a conflicting summary age. Actual lawyer capacity and appearance remain necessary to produce a case effect.

## Team 1 handoff: numerical evidence and outcome connections

Inspected main: `31edf5da5eedc83ebaff2b63cf3d41e9b241d7e4`. Existing connections are recorded below; Team 6 has not accepted their runtime behavior or measured a watched world.

| Decision          | Numerical evidence                                                                                                                                                            | Existing outcome-web link                                                                                          | Integration limit                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| annual-rent-limit | SF1994 expansion: mobility −20%, treated rental supply −15%; final abstract point estimates, no retrieved confidence interval                                                 | `rent-control-to-tenant-stays` → `housing.renter-moves`; `rent-control-to-rental-supply` → `housing.rental-supply` | Existing zero/12-month lags are not established by this research. Preserve treatment coverage; statewide caps differ.                         |
| eviction-counsel  | Original published Table3: formal-execution representation estimate −8.4pp, ZIP-clustered SE2.1pp. Approximate95% interval calculated as estimate±1.96SE: −12.516 to−4.284pp. | `right-to-counsel-to-evictions` → `housing.eviction`                                                               | Representation IV effect differs from existing aggregate −62% law link. Record service/appearance; do not count a lawyer's case effect twice. |

The annual-cap and counsel decisions contain numerical evidence. Just-cause termination and preemption retain “no sized evidence” for downstream effects. Direct provider spending, lawful rent and statutory remedies are separate recorded money flows.

### Starting law in every place for the numerical-evidence decisions

`U` means unresearched, never absent law or permission. `F` refers to the sourced in-force detail listed after the table. Each JSON cell retains its own detail and source IDs.

| Place | Annual rent limit | Eviction counsel |
| ----- | ----------------- | ---------------- |
| AL    | U                 | U                |
| AK    | U                 | U                |
| AZ    | U                 | U                |
| AR    | U                 | U                |
| CA    | F                 | U                |
| CO    | U                 | U                |
| CT    | U                 | U                |
| DE    | U                 | U                |
| FL    | U                 | U                |
| GA    | U                 | U                |
| HI    | U                 | U                |
| ID    | U                 | U                |
| IL    | U                 | U                |
| IN    | U                 | U                |
| IA    | U                 | U                |
| KS    | U                 | U                |
| KY    | U                 | U                |
| LA    | U                 | U                |
| ME    | U                 | U                |
| MD    | U                 | U                |
| MA    | U                 | U                |
| MI    | U                 | U                |
| MN    | U                 | U                |
| MS    | U                 | U                |
| MO    | U                 | U                |
| MT    | U                 | U                |
| NE    | U                 | U                |
| NV    | U                 | U                |
| NH    | U                 | U                |
| NJ    | U                 | U                |
| NM    | U                 | U                |
| NY    | U                 | F                |
| NC    | U                 | U                |
| ND    | U                 | U                |
| OH    | U                 | U                |
| OK    | U                 | U                |
| OR    | F                 | U                |
| PA    | U                 | U                |
| RI    | U                 | U                |
| SC    | U                 | U                |
| SD    | U                 | U                |
| TN    | U                 | U                |
| TX    | U                 | U                |
| UT    | U                 | U                |
| VT    | U                 | U                |
| VA    | U                 | U                |
| WA    | U                 | U                |
| WV    | U                 | U                |
| WI    | U                 | U                |
| WY    | U                 | U                |
| DC    | U                 | U                |
| PR    | U                 | U                |
| GU    | U                 | U                |
| VI    | U                 | U                |
| AS    | U                 | U                |
| MP    | U                 | U                |

- `annual-rent-limit/CA`: State formula lesser of5%+applicable CPI or10%, not one statewide percentage. For increases beforeAugust2026 use applicableApril2025/April2024 CPI orMarch fallback. Original SB567 sunsetJanuary2030; covered-unit eligibility and valid local caps require individual checks. [ca-tenant2023](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB567), [ca-cap-code](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1947.12.)
- `annual-rent-limit/OR`: DAS published2026 standard eligible-tenancy maximum9.5%; manufactured-dwelling/marina facilities over30spaces6%,30or fewer standard formula.15year new-construction and regulated affordable-housing exemptions require eligibility review. [or-cap2019](https://olis.oregonlegislature.gov/liz/2019R1/Downloads/MeasureDocument/SB608), [or-cap2023](https://www.oregonlegislature.gov/bills_laws/lawsstatutes/2023orlaw0226.pdf), [or-cap2026](https://apps.oregon.gov/oregon-newsroom/OR/DAS/Posts/Post/2026-Rent-Stabilization-Percentages)
- `eviction-counsel/NY`: NYC law2017 as amended2023: full-representation eligibility age60+ OR gross household income≤200%FPG; brief assistance for covered tenants subject to appropriation. Housing-court and NYCHA proceedings separately specified. Original2022deadline later advanced; no claim all eligible tenants actually received counsel. [nyc-counsel2017](https://legistar.council.nyc.gov/View.ashx?GUID=EDE65522-DA06-469F-9892-7932B89B757B&ID=5809782&M=F), [nyc-counsel2023](https://legistar.council.nyc.gov/View.ashx?GUID=F2D48501-6816-42D4-BF46-C895D39C6AC1&ID=11802978&M=F), [nyc-counsel-code](https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-47842)

## Wider knock-on effects and missing links

Eight housing catalog topics and further tenancy/preemption decisions remain. The national rent-preemption count is unverified. Oregon's complete current local-rent exceptions could not be fetched. Full amendment routes, large-city charter variations, additional starting laws and study intervals remain research gaps. Germany supplies a sourced redesign example separating initial rent, existing-tenancy adjustments, property coverage and regional designation; its authority does not transfer to U.S. cities.

The original papers' populations and units constrain transfer. A reported program outcome rate is not a causal effect. No game outcome producer or consumer was edited. Team 1 owns law and outcome integration, including any repair to existing lags or coefficient application.

## VITAL STATISTICS

- Exactly two new claimed paths: housing JSON and this report. Existing owners, sources, saves and the root index are preserved.
- Authority schema/evidence structure: PASS. Mechanical report check: PASS with zero errors and zero warnings. Neither check proves all legal facts or area completion.
- No TypeScript changed; no game tests, browser, build, heavy simulation or benchmark run.
- The sole Low source helper supplied bounded CA/OR and counsel packets. Root independently checked the final AER abstract, Oregon's 2026 announcement, California current cap and SB567, NYC certified laws, and the published counsel article/Table3. Some other source details remain helper-reported.

## NEEDS LAMONTAE

No permission or product decision requested. Team 6 continues housing research and publishes cohesive finished increments. Claude retains merge authority.

## PLACEHOLDERS

Unknown law/authority cells and “no sized evidence” are disclosed evidence gaps. Proposed mechanisms are handoff requirements, not created world facts.

## Sources

- [ca-cap2019: California AB1482 enacted Chapter597](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201920200AB1482)
- [ca-tenant2023: California SB567 enacted Chapter290 operative April2024](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB567)
- [ca-cap-code: California Civil Code1947.12; chapter history identifies SB567 operative2024](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1947.12.)
- [ca-local-code: California Civil Code1954.52 Costa-Hawkins limitations](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1954.52.)
- [or-cap2019: Oregon SB608 enacted2019 Chapter1](https://olis.oregonlegislature.gov/liz/2019R1/Downloads/MeasureDocument/SB608)
- [or-cap2023: Oregon SB611 enacted2023 Chapter226](https://www.oregonlegislature.gov/bills_laws/lawsstatutes/2023orlaw0226.pdf)
- [or-cap2026: Oregon DAS published2026 rent-stabilization percentages](https://apps.oregon.gov/oregon-newsroom/OR/DAS/Posts/Post/2026-Rent-Stabilization-Percentages)
- [or-local-gap: Oregon ORS91.225 current official chapter indexed; full retrieval failed](https://www.oregonlegislature.gov/bills_laws/ors/ors091.html)
- [ma-rentbar: Massachusetts General Laws40P4 voluntary compensated exception](https://malegislature.gov/Laws/GeneralLaws/PartI/TitleVII/Chapter40P/Section4)
- [ma-rentpreempt: Massachusetts General Laws40P5 statewide preemption](https://malegislature.gov/Laws/GeneralLaws/PartI/TitleVII/Chapter40P/Section5)
- [ca-prop33: California Legislative Analyst2024 Proposition33 ballot analysis](https://lao.ca.gov/BallotAnalysis/Proposition?number=33&year=2024)
- [sf-rent-study: Diamond McQuade Qian2019 original AER rent-control evaluation](https://www.aeaweb.org/articles?id=10.1257/aer.20181289)
- [sf-rent-manuscript: Diamond McQuade Qian author manuscript March2019; not final-paper table proof](https://web.stanford.edu/~diamondr/DMQ.pdf)
- [hud-fairhousing: HUD Fair Housing Act overview; federal discrimination protections, not local rent grant](https://www.hud.gov/helping-americans/fair-housing-act-overview)
- [de-initial-rent: German BGB556d rent at start and Land designation](https://www.gesetze-im-internet.de/bgb/__556d.html)
- [de-rent-exemptions: German BGB556f new construction and modernization exceptions](https://www.gesetze-im-internet.de/bgb/__556f.html)
- [de-existing-rent: German BGB558 comparative-rent and three-year cap](https://www.gesetze-im-internet.de/bgb/__558.html)
- [nyc-counsel2017: NYC certified LocalLaw136/2017 enacted August11](https://legistar.council.nyc.gov/View.ashx?GUID=EDE65522-DA06-469F-9892-7932B89B757B&ID=5809782&M=F)
- [nyc-counsel2023: NYC certified LocalLaw20/2023 expands full representation to age60+](https://legistar.council.nyc.gov/View.ashx?GUID=F2D48501-6816-42D4-BF46-C895D39C6AC1&ID=11802978&M=F)
- [nyc-counsel-code: NYC current official publisher administrative code26-1302](https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-47842)
- [counsel-study2023: Cassidy Currie2023 published Journal of Public Economics222104844 Table3](https://miketcassidy.com/files/cassidy-currie-2023-evictions-jpube.pdf)

## Superseding anchor rule

Owner8:54/8:56 requires exact own-place legal values and all-game-place research for every non-law anchor, followed by realistic per-world variation and simulation evolution. Numeric study effects here are contextual results only until coverage is established; no runtime or seeded world parameter is implemented. One-place Manhattan/SFO/SanFrancisco/NYC evidence cannot become a national anchor. Existing compliant seeded estimates are retained. See Team6handback for exact fields,source coverage and unresolved gaps.
