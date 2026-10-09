# Alexandria Ocasio-Cortez: no documented path reproduced

The sourced old-core runs reproduced 0 documented steps across 4 runs. The subject aged and the clock reached the recorded dates. The adapter could store event labels, but it did not establish the family, work, civic, or political state needed for this life. These results identify missing replay bindings and background state. They do not establish how the full populated game would behave.

## Why the path broke

Measured: the evaluator requires dated engine observations with record IDs for each target. A stored label or forced selection cannot satisfy that test. `scripts/life-replay/evaluator.ts:102`

| Start      | Mode | Steps | Labels only | Reproduced | Outside bounds | Unmeasured bounds | First broken link |
| ---------- | ---- | ----- | ----------- | ---------- | -------------- | ----------------- | ----------------- |
| 1989-10-13 | god  | 10    | 10          | 0          | 0              | 0                 | family-move       |
| 1989-10-13 | free | 10    | 10          | 0          | 0              | 0                 | family-move       |
| 2021-01-01 | god  | 10    | 10          | 0          | 0              | 1                 | green-new-deal    |
| 2021-01-01 | free | 10    | 10          | 0          | 0              | 1                 | green-new-deal    |

Measured: god mode from October 13, 1989 forced 0 of 4 documented decisions. An unavailable choice stays a gap. `scripts/life-replay/runner.ts:337`

Measured: god from January 1, 2021 supplied 9 past steps; 0 had verified active state. The first later break was green-new-deal. `scripts/life-replay/evaluator.ts:177`

Measured: god mode from January 1, 2021 forced 0 of 1 documented decisions. An unavailable choice stays a gap. `scripts/life-replay/runner.ts:337`

Measured: free from January 1, 2021 supplied 9 past steps; 0 had verified active state. The first later break was green-new-deal. `scripts/life-replay/evaluator.ts:177`

Measured: all supported steps below have generic event-label storage. The capability probe runs the canonical event writer on a discarded fork. It proves label storage, without validating the factual payload or changing the live world. `scripts/life-replay/old-core.ts:393`

Measured: initialization creates one subject and a birthplace. Family, employers, offices, and an electorate remain absent. Past checkpoint labels do not initialize active education, jobs, residences, or offices. `scripts/life-replay/old-core.ts:110`

Measured: era inputs and external events create audit labels without running state-changing handlers. The result is an adapter gap; native law and election systems were not exercised by this world. `scripts/life-replay/old-core.ts:207`

Inferred: god mode can control available native life-situation choices, but the adapter cannot interrupt internal old-clock decisions. Documented career actions need bindings to actual enabled decisions before their consequences can be tested. `scripts/life-replay/old-core.ts:246`

Measured: prior links remain broken until their results or initialized past state are verified. The dependency list is a continuity check, not a claim that one historical event caused another. `scripts/life-replay/evaluator.ts:165`

| Documented step              | Required mechanism   | Source date window            | god                            | free                           | Public evidence                                                                                                                                                                                                                                          |
| ---------------------------- | -------------------- | ----------------------------- | ------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| family move (event)          | residence move       | 1994-10-13 through 1995-10-12 | Label only; no matching result | Label only; no matching result | [National Catholic Reporter](https://www.ncronline.org/news/aoc-credits-her-catholic-faith-positions-health-care-environment); [National Women’s History Museum](https://www.womenshistory.org/education-resources/biographies/alexandria-ocasio-cortez) |
| high school (outcome)        | education completion | 2007-01-01 through 2007-12-31 | Label only; no matching result | Label only; no matching result | [U.S. House of Representatives](https://history.house.gov/People/Detail/25769805196)                                                                                                                                                                     |
| father dies (event)          | family loss          | 2008-01-01 through 2008-12-31 | Label only; no matching result | Label only; no matching result | [U.S. House of Representatives](https://ocasio-cortez.house.gov/about)                                                                                                                                                                                   |
| college graduation (outcome) | education completion | 2011-01-01 through 2011-12-31 | Label only; no matching result | Label only; no matching result | [U.S. House of Representatives](https://history.house.gov/People/Detail/25769805196)                                                                                                                                                                     |
| restaurant work (decision)   | employment           | 2011-01-01 through 2018-06-25 | Label only; no matching result | Label only; no matching result | [U.S. House of Representatives](https://ocasio-cortez.house.gov/about); [National Women’s History Museum](https://www.womenshistory.org/education-resources/biographies/alexandria-ocasio-cortez)                                                        |
| standing rock (decision)     | cause participation  | 2016-01-01 through 2016-12-31 | Label only; no matching result | Label only; no matching result | [National Women’s History Museum](https://www.womenshistory.org/education-resources/biographies/alexandria-ocasio-cortez)                                                                                                                                |
| house campaign (decision)    | candidacy            | 2017-01-01 through 2018-06-25 | Label only; no matching result | Label only; no matching result | [U.S. House of Representatives](https://ocasio-cortez.house.gov/about); [National Women’s History Museum](https://www.womenshistory.org/education-resources/biographies/alexandria-ocasio-cortez)                                                        |
| primary win (outcome)        | election result      | 2018-06-26 through 2018-06-26 | Label only; no matching result | Label only; no matching result | [National Women’s History Museum](https://www.womenshistory.org/education-resources/biographies/alexandria-ocasio-cortez)                                                                                                                                |
| house service (outcome)      | office service       | 2019-01-03 through 2019-01-03 | Label only; no matching result | Label only; no matching result | [U.S. House of Representatives](https://history.house.gov/People/Detail/25769805196)                                                                                                                                                                     |
| green new deal (decision)    | legislative proposal | 2021-04-20 through 2021-04-20 | Label only; no matching result | Label only; no matching result | [U.S. Senate](https://www.markey.senate.gov/news/press-releases/senator-markey-and-representative-ocasio-cortez-reintroduce-green-new-deal-resolution)                                                                                                   |

## Numbers and background

Measured: god from October 13, 1989: numeric checks 1; outside bounds 0; unmeasured 0. `scripts/life-replay/evaluator.ts:125`

- house-service, person.ageYears: inside; actual 29, minimum 25, maximum none.

Measured: free from October 13, 1989: numeric checks 1; outside bounds 0; unmeasured 0. `scripts/life-replay/evaluator.ts:125`

- house-service, person.ageYears: inside; actual 29, minimum 25, maximum none.

Measured: god from January 1, 2021: numeric checks 1; outside bounds 0; unmeasured 1. `scripts/life-replay/evaluator.ts:125`

- house-service, person.ageYears: unmeasured; actual unavailable, minimum 25, maximum none.

Measured: free from January 1, 2021: numeric checks 1; outside bounds 0; unmeasured 1. `scripts/life-replay/evaluator.ts:125`

- house-service, person.ageYears: unmeasured; actual unavailable, minimum 25, maximum none.

Historical point targets are exact comparisons, not population ranges. Legal age bounds test eligibility only. An unmeasured number does not pass the bound.

The source file lists these public-data gaps:

- family.exact-income-and-balances: Not established by the cited public sources; no value supplied to the core.
- person.numeric-traits-and-private-beliefs: Not established by the cited public sources; no value supplied to the core.

Inferred: retrospective annual statistics, adult faith descriptions, and endogenous later law outcomes must remain references rather than early world inputs. The runner excludes rows marked as references. `scripts/life-replay/runner.ts:186`

## What happens next

P9 supplies the sourced data, runner, evaluator, and these gaps. P8 owns world initialization, typed event handlers, ordinary decision scoring, and measured consequences. Each missing binding must expose actual records through the versioned interface before the same replay can validate it.

The mechanisms this life needs are residence-move, education-completion, family-loss, employment, cause-participation, candidacy, election-result, office-service, legislative-proposal. Unavailable facts remain explicit gaps; they must not become invented private attributes.

## Method

Diagnostic audit run in the worker's cloud environment. No player screen was exercised. Each receipt came from its own Node subprocess with a documented timeout. The life files and public citations remain developer data.

- god, October 13, 1989 through April 20, 2021: 11,512 simulated days; horizon complete. Runner time: 1,009 milliseconds. Peak process RSS: 978,374,656 bytes. Receipt: [alexandria-ocasio-cortez.birth.god.json](receipts/alexandria-ocasio-cortez.birth.god.json). Core revision: 19f63909a59b3227ef18dd92476aff1b53bff696.
- free, October 13, 1989 through April 20, 2021: 11,512 simulated days; horizon complete. Runner time: 1,037 milliseconds. Peak process RSS: 937,959,424 bytes. Receipt: [alexandria-ocasio-cortez.birth.free.json](receipts/alexandria-ocasio-cortez.birth.free.json). Core revision: 19f63909a59b3227ef18dd92476aff1b53bff696.
- god, January 1, 2021 through April 20, 2021: 109 simulated days; horizon complete. Runner time: 84 milliseconds. Peak process RSS: 865,296,384 bytes. Receipt: [alexandria-ocasio-cortez.modern-start.god.json](receipts/alexandria-ocasio-cortez.modern-start.god.json). Core revision: 19f63909a59b3227ef18dd92476aff1b53bff696.
- free, January 1, 2021 through April 20, 2021: 109 simulated days; horizon complete. Runner time: 106 milliseconds. Peak process RSS: 851,881,984 bytes. Receipt: [alexandria-ocasio-cortez.modern-start.free.json](receipts/alexandria-ocasio-cortez.modern-start.free.json). Core revision: 19f63909a59b3227ef18dd92476aff1b53bff696.

Runner time excludes module import and subprocess startup. Peak RSS includes the process lifetime. A one-subject world without ordinary scheduled population activity cannot establish normal-year throughput. Adjacent manifests record the source hashes, Node version, and whether the measured source was clean.
