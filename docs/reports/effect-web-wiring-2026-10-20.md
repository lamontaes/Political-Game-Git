# A town's causes now reach its people, unevenly, as the research says

The CTO has one call to make: whether monthly crimes against households, with no offenders or arrests, fit the owner's October 16, 2026 ruling that a crime engine comes later. The owner has one question: should people's opinions on policy shift when they hear the town got poorer, more dangerous or dearer? Today they hear it and it reaches their vote, but their stances do not move. Of 221 researched causes, 109 now change what happens to people, against 5 this morning, and 15 land differently by age, sex, income or home. The per-person reach is merged, and fifteen more pull requests wait for the merging sessions.

## Before and after

A link is one researched cause and its effect, such as "a point of unemployment raises burglary 3%". Before today, 5 of the 221 links changed anything a person lives with. Now 109 do, and every other link names why it does not.

Measured by playing a full year in two places drawn at random from all 56, once on main and once on a branch that merges every fix.

|                                                                       | Piti, Guam, before | Piti, Guam, after | Grace, Mississippi, before | Grace, Mississippi, after |
| --------------------------------------------------------------------- | ------------------ | ----------------- | -------------------------- | ------------------------- |
| Links whose cause moved during the year                               | 18                 | 22                | 17                         | 20                        |
| Of those, links an engine reads into its own records                  | 2                  | 17                | 1                          | 11                        |
| Of the links that moved, those whose cause is another engine's record | 0 of 18            | 11 of 22          | 0 of 17                    | 11 of 20                  |
| Seconds to play the year                                              | 50                 | 48                | 22                         | 23                        |

These numbers are measured on the branch before the cause-of-death and moderator work merged in. Run time stayed within 2 seconds in both towns on a shared machine. Only about 20 links move in a played year because most links start from a law, and these towns passed no new law in the year.

Across all 221 links, from the static matrix (`docs/reports/effect-web-matrix-2026-10-20.json`):

| Point                                                            | Before     | After                                                                           |
| ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| Reaches an engine's records, or an engine already carries it     | 5 of 221   | 109 of 221                                                                      |
| Lands differently on people, from a researched split             | 0 of 221   | 15 of 221                                                                       |
| Links the web runs that have a recorded spread around their size | 94 of 130  | 121 of 121 (the 14 poverty links stopped running, and others were reclassified) |
| Not reaching anyone and with no stated reason                    | 216 of 221 | 0 of 221                                                                        |

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

## Why 112 links still reach no one

Each is listed in `src/core2/data/outcome-web/unwired.json` with its reason and an open stopgap. A test keeps that list equal to the matrix (`src/core2/outcome-web-unwired.test.ts`).

- **56 of the 112 point at something nothing records.** Examples are larceny, reoffending, arrests, convictions, earnings at 28, flood damage, media trust and same-sex marriages.
- **56 of the 112 point at a measure no engine reads yet.** Examples:
  - Health coverage: the coverage record exists only on an open branch.
  - Firearm homicide among adults: stand-your-ground and carry-permit laws still move only the web's number, because the crime engine records no homicides.
  - Air quality: health reads it, but it is a ledger number with no record of its own.
  - Government borrowing cost: no government borrows at a rate.
  - Vandalism: there is no national rate to start from.

By point, after the fixes:

- **Cause:** 149 of 221 links read a real record or law. Some read a record whose own effect is not yet wired, which is why this exceeds 105.
- **Size:** 157 of 221 have a size with a sourced or labeled spread. 20 of those are research findings of no effect, whose interval was not found in the source text, so their spread is recorded as zero.
- **Varied:** 15 of 221 vary by person. The research behind most others reports no split, and each such link says so.
- **Timing:** 2 of 221 links build up over months: violent crime's pull on moving away builds over 60 months, and new transit service over 24. The rest change fully once their lag passes.

## Shifting one cause in a copy of the town

The twin check plays Paris, Arkansas, twice for three months, shifting one cause in one copy, and compares every record. Before the fixes, no engine record moved for any of 15 causes. After them, 12 of 16 causes move records outside the web:

- Unemployment, police staffing and the crime index change the month's crimes.
- Violent crime moves families out.
- Particulates and the speed limit change counted deaths, and the birth level changes counted births.
- The corporate tax, broadband, road condition and transit change pay, prices and the budgets that follow.
- Home prices change only the economy's own figures.

The other four do not move in three months. The uninsured share, poverty and graduation act after 12 to 120 months, and SNAP receipt has no engine reader, which its stopgap records. The counts of moved record kinds include knock-on changes, since one changed record moves others. Earlier runs undercounted for two reasons, both now fixed: the check lost its shift whenever the web rewrote a month's row, and it could not see nested fields.

## What happens next

- **Merged to main:** per-person reach #5557, the audit #5564, health #5627, knowing #5637, moves #5612, births #5567, housing #5611, voting #5563 and causes of death #5650.
- **Still open, each merged with main:** schools #5609, poverty #5610, labor #5617, prices #5618, crime #5619, sizes #5624 and moderators #5648. The last piece is #5639, the branch carrying the unwired list and this report.
- **Overlap the merger will meet:** poverty (#5610) and labor (#5617) add the same `carriedBy` support to `outcome-web-model.ts`, so whichever lands second merges cleanly.
- **Sources not reached:** 12 links had a possible split in research the helper could not open (paywall or blocked); they stay unvaried until a session with library access reads them.

Method: the static matrix is `scripts/outcome-web/effect-matrix.ts`. The played years are `scripts/outcome-web/web-year.ts` with seeds ewyear-a and ewyear-b. The twin check is `src/core2/outcome-web-twins.test.ts` with seed ew20oct26.
