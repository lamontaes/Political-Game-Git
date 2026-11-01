# Finishing the effects web with ultracode workflows

Laws lead, October 29. A read-only survey of all 61 unread links (seven researchers, one planner, one completeness critic) found how each link can reach a person. This is the plan with the critic's corrections applied.

**What the owner gets.** About 190 of the 246 research links will reach a person, up from 168. That is 21 to 25 more effects in the game, and about 15 of them show in an ordinary played year. Another 23 or 24 will be graded about zero, because the research finds no effect. About 30 stay unread, each on a stopgap that names the missing record. Ten family workflows take four to five working days, two at a time.

## Where it stands

Main shows 169 reaching, 18 about zero and 59 unread. One reaching link is false: licensing-reform-to-poverty counts only because its `carriedBy` text is not empty, and that text says no engine carries it. The honest start is **168 reaching, 18 about zero, 60 unread**. Ten links are in flight:

- newspaper closures (#6763);
- medical debt (`claude/laws-medical-debt`);
- the two loan caps (the lenders helper);
- births, marriage and child poverty (the family helper);
- the coverage and marriage links on the medical branch.

## The families, in order

Each family is one PR, proven on two drawn places, with the matrices regenerated once. No family touches `src/bench` or `src/director`.

| #   | Family                              | Links                                                                                                                                                                                                                                                          | Gain                  | Waits on                                                                |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| 1   | Grades and carried rows (data only) | about zero: housing vouchers to graduation and to crime, library materials, education to mortality, the Congress stock ban. Carried: graduation to earnings, rent burden to homelessness. Also clear licensing's stale `carriedBy` and fix stale stopgap text. | +1 net, +5 about zero | nothing                                                                 |
| 2   | Treasury interest                   | federal deficit; newspaper closure to borrowing cost                                                                                                                                                                                                           | +2                    | #6763 for the second                                                    |
| 3   | Medical bills                       | catastrophic bills, eviction-to-hospital care                                                                                                                                                                                                                  | +2                    | the medical-debt PR                                                     |
| 4   | Voting relief                       | relief spending to votes                                                                                                                                                                                                                                       | +1                    | #6763; its proof is a four-year run (first race November 2028)          |
| 5   | Jobs pull to work                   | broadband, transit loss, birth-year air                                                                                                                                                                                                                        | +3                    | research (below)                                                        |
| 6   | Sentencing law                      | lower-level release to larceny, mandatory minimums                                                                                                                                                                                                             | +2                    | a new law question (words reviews its name; the CTO scopes it)          |
| 7   | Place prices                        | federal rail to riders, container deposits to litter                                                                                                                                                                                                           | +2                    | the lenders PR; litter needs a cleanup-cost record and a 13-month proof |
| 8   | Child health                        | gas-hookup ban to child asthma                                                                                                                                                                                                                                 | +1                    | a childhood asthma row in the health engine                             |
| 9   | Births into credit                  | abortion denied to financial distress                                                                                                                                                                                                                          | +1                    | the family helper's newborn cost                                        |
| 10  | Research PR                         | sizes for eviction care, broadband, transit, birth-year air, heat, AC use, carbon monoxide                                                                                                                                                                     | —                     | first, on day one                                                       |

**Parked until their record exists** (the critic's corrections):

- drug negotiation: never in force in play, and there are no federal-only answers yet;
- heat deaths and water violations to birth weight: nothing records hot days or water violations; heat waits on `world-weather-record-by-place-and-day`;
- the air-conditioning moderator: the matrix does not follow it.

## The workflow for one family

1. **Build.** A builder works in a sparse copy (`scripts/storage/helper-checkout.sh new`) on its own branch.
2. **Test.** The builder runs only the family's own played test (twin worlds, two drawn seeds) under a machine-wide lock, because a two-world test fills the container's memory if two run at once.
3. **Review.** Three adversarial reviewers check test honesty, the project rules and correctness. They try to refute; a defect counts only if a reviewer finds real evidence.
4. **Repair.** The builder fixes each defect a reviewer confirmed, at its root, and reruns the test.
5. **Open the PR.** The lead opens it and hands it to the checker its number names. The checker runs typecheck, the guards and the gate (builders build; checkers check).

**Capacity.** Two family workflows at once (two agents each on four CPUs), plus one research workflow. Disk: narrow `/home/user/h-lenders` (a full 3.3 GB copy) and delete each workflow copy once its branch is pushed.

## Research first

One agent fetches and quotes each source, and a second refetches and checks the quote and the conversion. Values are SOURCED, or ESTIMATED from the nearest study with its spread:

- Eviction care: Collinson et al. 2024.
- Broadband: Zuo 2021.
- Transit: Bastiaanssen et al. 2020.
- Birth-year air: Isen et al. 2017.
- Heat: Deschênes and Greenstone 2011; Barreca et al. 2016.
- Air conditioning: Doremus et al. 2022.
- Carbon monoxide: Currie et al. 2009.
- Newspaper bonds: Gao, Lee and Murphy 2020.
- Press trust: Archer and Peterson 2025.
- Larceny starting rows by state.

## What stays unread, and why

- **Coverage to medical debt (CTO ruling 8):** turning it on would count the same debt twice.
- **Both marriage-equality links:** the law is national, so the cause cannot vary between places.
- **Homicide nearby and police killings:** they need geography below the town.
- **Teacher quality, child food stamps, congestion, the EITC, farmland and federal prison minimums:** their causes never move in play, or their evidence is contested.
- **Sixteen links that need a background record**, built one record at a time after the ten families, each from research as the owner ruled: adult mood, arrivals from abroad, weather, child blood lead, school staffing, press trust, student loans and disaster job losses.

## Decisions

There are no owner decisions. The CTO rules on these under the standing rules:

- grading a statistically insignificant result as about zero;
- library materials, which has no study at all, so its grade is an estimate rounded to zero;
- a "cause cannot vary" grade for the marriage-equality links;
- the scope of new law questions (reclassifying low-level offenses, summer jobs, incentive deals);
- the 2022 student-loan forgiveness terms as a registered stopgap.

## Time

Four to five working days for the ten families. Most of it is the multi-year proofs, each a twin pair on two draws under one lock at about two minutes per game year: relief about four years, rail two and a half, gas hookups ten or more. The sixteen record families follow over the next week, which brings the total to about 200.
