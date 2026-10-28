# A town's causes now reach its people, unevenly, as the research says

> Superseded on October 28, 2026: the count of research links is kept once, at the top of docs/reports/law-wiring-table.md beside the laws, from docs/reports/effect-web-matrix-2026-10-20.json. This report keeps its October 26 numbers as history.

The static matrix refreshed from main on October 26 finds 140 of 237 researched links reaching engine records or carried by an engine, against 5 on October 20. Fifteen have a complete researched split by person; seven more have a partial one. Every other link names why it does not reach. Health, labor, civic and environment are on main; schools and places and services remain in review. These are static wiring counts, separate from the earlier played-year measurements below. People hear the town's conditions through the news. The owner ruled on October 22 that hearing them should move a stance for those the story reached; that change is built and waits on counted readers' stances.

## Before and after

A link is one researched cause and its effect, such as "a point of unemployment raises burglary 3%". On October 20, 5 of the 221 links then researched changed anything a person lives with. On main on October 26, the refreshed matrix counts 140 of 237 reaching or carried, and every other link names why it does not. Six of the links added since the crime family came with the labor law wiring: unemployment insurance's two links into poverty reach, and four payroll taxes' links into unemployment, which the research finds about zero, do not.

Measured by playing a full year in two places drawn at random from all 56, once on main and once on a branch that merges every fix.

|                                                                       | Piti, Guam, before | Piti, Guam, after | Grace, Mississippi, before | Grace, Mississippi, after |
| --------------------------------------------------------------------- | ------------------ | ----------------- | -------------------------- | ------------------------- |
| Links whose cause moved during the year                               | 18                 | 22                | 17                         | 20                        |
| Of those, links an engine reads into its own records                  | 2                  | 17                | 1                          | 11                        |
| Of the links that moved, those whose cause is another engine's record | 0 of 18            | 11 of 22          | 0 of 17                    | 11 of 20                  |
| Seconds to play the year                                              | 50                 | 48                | 22                         | 23                        |

These numbers are measured on the branch before the cause-of-death and moderator work merged in. Run time stayed within 2 seconds in both towns on a shared machine. Only about 20 links move in a played year because most links start from a law, and these towns passed no new law in the year.

Across all links, from the static matrix (`docs/reports/effect-web-matrix-2026-10-20.json`), before on October 20 and after refreshed from main on October 26:

| Point                                                            | Before     | After                                                                                |
| ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| Reaches an engine's records, or an engine already carries it     | 5 of 221   | 140 of 237                                                                           |
| Lands differently on people, from a researched split             | 0 of 221   | 15 of 237                                                                            |
| Links the web runs that have a recorded spread around their size | 94 of 130  | 124 of 124 (the 14 poverty links stopped running, and others are carried by engines) |
| Not reaching anyone and with no stated reason                    | 216 of 221 | 0 of 237                                                                             |

## What a person now feels

Each claim is measured in the test named, in a drawn place.

- **Births:** a recession delays births most for women 20 to 24, about 2.8 times the average, and not at all past 40. An abortion ban's extra births fall most on women 20 to 24 and least on teenagers. Rising home prices raise owners' births and lower renters'. Counted women's own rates read this (`src/core2/births-counted.ts:559`). Tests: `src/core2/outcome-web-reach.test.ts` and `src/core2/births-counted-web.test.ts`.
- **Deaths:** dirtier air and abortion bans raise infant deaths, and a higher speed limit raises road deaths at the ages crashes kill most. Medicaid expansion cuts the death chance only for low-income people 55 to 64. At age 60 the multiplier on the death chance was 0.909 for the lowest income fifth and 1.003 for the highest; the test also raised the speed limit, whose road deaths raise everyone's chance slightly. Both tiers read this (`src/core2/health-web.ts`). Test: `src/core2/health-web.test.ts`.
- **Causes of death:** every death now carries a cause: overdose, firearm homicide, firearm suicide, motor vehicle or other, from NCHS shares by age. Harm reduction, cannabis sales, child-access gun laws, a minimum gun-buying age and the speed limit change that cause's share at the ages it strikes. A person with a substance-use disorder dies of an overdose first. In the test's shifted world the death multiplier was 1.116 at age 30 and 1.013 at 70 (`src/core2/death-cause.ts`). Test: `src/core2/death-cause.test.ts`.
- **Crime:** each month households are burglarized, robbed and assaulted at the national rates, times the town's conditions, and renters and the lowest income fifths are hit more. Three more points of unemployment raised burglary 2 to 5% a point, as researched. Voters now weigh crimes that happened, not a ledger rate (`src/core2/modules/crime.ts`). Test: `src/core2/modules/crime.test.ts`.
- **Moves:** rent stabilization keeps tenants 40 and older in place about four times as much as younger tenants. A rise in violent crime moves families with children out faster than other households (`src/core2/modules/moves.ts`). Test: `src/core2/moves-web.test.ts`.
- **Housing:** a property tax change passes into each lease at renewal. By-right permitting raises apartment starts and rent control lowers them, and vouchers and housing first lower the income a homeless household needs to be rehoused (`src/core2/housing-occupancy.ts`). Test: `src/core2/housing-web.test.ts`.
- **Work and pay:** a corporate tax change falls about twice as hard on women's pay as on men's, and public-sector bargaining raises only men's earnings. Childcare and paid leave change who looks for work. The retirement age now moves when workers start to leave through the law in force, so the web's retirement-age link is marked as carried by the jobs engine and no longer runs a second time (`src/core2/modules/jobs.ts`). Test: `src/core2/jobs-web.test.ts`.
- **What does not work yet in work and pay:** the minimum-wage links count as reaching in the static matrix, but in played towns they move nothing. The jobs engine scales the staffing of the employers it reviews, and none of those has a job under the line; the town's low-wage jobs belong to organizations the review never reaches (stopgap `SG-LABOR-low-wage-unreviewed`).
- **Schools:** each spring every eighth grader gets a math and a reading result, and each June every senior graduates or not. Equalized school funding raises results only in the two lowest income fifths (`src/core2/school-outcomes.ts`). Test: `src/core2/school-outcomes.test.ts`. The same law's separate link to spending per student does not move yet, because no law handler moves the education budget.
- **Prices and services:** each business sets its own price with the web's factor, so the town's prices come from its shops. Electricity bills, transit trips and home broadband follow the web, and broadband gains most in the lowest income fifth (`src/core2/modules/place-prices.ts`). Test: `src/core2/prices-web.test.ts`.
- **Poverty:** poverty is counted each month from real paychecks against the Census line, and the 14 links into poverty no longer move it a second time (`src/core2/world-poverty.ts`). Test: `src/core2/world-poverty.test.ts`.
- **Turnout:** each voter's chance of voting takes the web's factor by age. The six election laws the voting cost already carries are left out, so no law counts twice (`src/core2/turnout-web.ts`). Test: `src/core2/turnout-web.test.ts`.
- **Hearing about it:** the town's month becomes news. People hear it on their own schedule. The town's unemployment and crime count in their vote only once a story about them reached the town; their stances on policy questions do not move (`src/core2/outcome-news.ts`). Test: `src/core2/outcome-news.test.ts`.

## Chains seen in the played years

Measured in both towns, from the after-year records:

- Jobs, then the unemployment record, then births and crime: a second engine reads what the first engine wrote.
- Paychecks, then the poverty count, then students' math results: three engines in a row.
- Victimizations, then the town's violent-crime index, then next month's crimes.

## Why 97 links still reach no one

Each is listed in `src/core2/data/outcome-web/unwired.json` with its reason and an open stopgap. A test keeps that list equal to the matrix (`src/core2/outcome-web-unwired.test.ts`).

- **55 of the 97 point at something nothing records.** Examples are test scores, larceny, reoffending, arrests, convictions, earnings at 28, depression and blood pressure.
- **42 of the 97 point at a measure no engine reads yet.** Examples:
  - Unemployment, from four payroll taxes: the research finds about zero, so an engine would multiply by one.
  - Government borrowing cost, from five links: no government borrows at a rate.
  - Vandalism: there is no national rate to start from.
  - Food insecurity, from SNAP and the grocery tax exemption: no engine records a household going without food.
  - Medical debt in collections: no engine keeps a household's medical bills in collections.
  - Emissions, from the carbon price: the price engine reads them on the environment family's branch, which waits to merge.

By point, after the fixes:

- **Cause:** 168 of 237 links read a real record or law. Some read a record whose own effect is not yet wired, which is why this exceeds the 140 that reach.
- **Size:** 172 of 237 have a size with a sourced or labeled spread. The earlier audit also noted research findings of no effect whose interval was not found in the source text; those were recorded with zero spread.
- **Varied:** 15 of 237 vary by person. The research behind most others reports no split, and each such link says so.
- **Timing:** 2 of 237 links build up over months: violent crime's pull on moving away builds over 60 months, and new transit service over 24. The rest change fully once their lag passes.

## Shifting one cause in a copy of the town

The twin check plays Paris, Arkansas (seed `ew20oct26`), twice for a played year, shifting one cause in one copy, and compares every record. Before the fixes, no engine record moved for any of 15 causes in three months. After them, rerun for twelve months, it shifts 17 causes and 12 move records outside the web, the same 12 as the three-month runs. Each line names one record the shifted copy changed:

- Unemployment, police staffing and the crime index change the month's crimes (`core2-crime-v1/months` `jurisdiction_2516a182010dba98:2025-02`).
- Violent crime moves families out: a full resident's pull to move (`moves/pulls` `person_fe76daa906c7aeb9`).
- The birth level changes births: a counted month (`core2-renewal-v1/counts` `jurisdiction_2516a182010dba98:2025-03`) and a full birth (`person_6657abfcc9767712:birth`).
- Particulates change counted infant deaths (`core2-renewal-v1/counts` `jurisdiction_2516a182010dba98:2025-03`).
- The rural speed limit changes deaths: counted months, and a full resident's death (`life.death:person_1065ef2358d40a00:2026-01-27`).
- Broadband changes hiring (`jobs/changes` `job-change:2025-03-03:job:position:organization_c9eaaa24496abaa1:2025-03-01:1:person_becc24b61bdd61ac:hire`).
- Road condition and transit change what businesses charge (`business/trading` `business-trading:organization_5d437b7950c7dde6:2025-04-01` and `:2025-05-01`); the corporate tax changes pay, prices and the budgets that follow.
- Home prices change only the economy's own figures.

The other five do not move in twelve months. The uninsured share, poverty and graduation act after 12 to 120 months. SNAP receipt has no engine reader (`SG-WEB-unread-household-food-insecurity`), and drinking-water violations reach only infants' birthweight, which no engine records; their stopgaps say so. The counts of moved record kinds include knock-on changes, since one changed record moves others. Earlier runs undercounted for two reasons, both now fixed: the check lost its shift whenever the web rewrote a month's row, and it could not see nested fields. The matrix's `twins` block holds this run, with up to three records for each table that moved.

On main on October 25, with the crime family merged, a four-month run in Paris moves the same 12 causes. In a drawn place, Norman, Nebraska (seed `8a8ec8742d0d3fb6`), 9 of the 17 move records in four months; why particulates, the corporate tax and reported crime moved nothing there was not traced.

## What happens next

- **On main:** the capstone (#5639), school engine (#5609), public finance (#5905), crime and justice (#5892), health waiting links (#5980), writers' load fix (#6054), and the health (#6006), labor (#6004), civic (#6020) and environment (#5915) families.
- **Also merged:** the twin text (#6045), end-to-end proof (#5912 and #6161), lived-crime talk (#5922), coverage reads (#5661), counted coverage (#5475), bribe measurement (#6053) and voter-groups rounding fix (#6061).
- **Still in review at this refresh:** schools (#5934), and places and services (#6042, carrying the still-open matrix grading #6008). Their current branch checks belong to those PRs; this report does not claim them green.

## For the next session

1. After a family merges, integrate main into the other open effects branches and refresh the coverage, unwired list and matrix with the writers in `scripts/outcome-web/`. The writers' load fix #6054 is on main.
2. Rerun the twin check on current main in Paris, Arkansas (seed `ew20oct26`) and one drawn place. The twelve-month matrix block and October 25 four-month results above are retained historical runs; this documentation refresh does not claim a new simulation.
3. When the remaining families merge, rerun the played years (`scripts/outcome-web/web-year.ts`, seeds `ewyear-a` and `ewyear-b`) and refresh the before-and-after table above.
4. Next work comes from the current pool, including `web-fare-free-riders-reach-nothing` and `web-civic-scandal-played-witness`; check their latest Notes before claiming.

- **Sources not reached:** 12 links had a possible split in research the helper could not open (paywall or blocked); they stay unvaried until a session with library access reads them.

Method: the static matrix is `scripts/outcome-web/effect-matrix.ts`. The played years are `scripts/outcome-web/web-year.ts` with seeds ewyear-a and ewyear-b. The twin check is `src/core2/outcome-web-twins.test.ts` with seed ew20oct26.
