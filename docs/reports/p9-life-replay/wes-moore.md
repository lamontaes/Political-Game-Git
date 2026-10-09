# Wes Moore: no documented path reproduced

The sourced old-core runs reproduced 0 documented steps across 4 runs. The subject aged and the clock reached the recorded dates. The adapter could store event labels, but it did not establish the family, work, civic, or political state needed for this life. These results identify missing replay bindings and background state. They do not establish how the full populated game would behave.

## Why the path broke

Measured: the evaluator requires dated engine observations with record IDs for each target. A stored label or forced selection cannot satisfy that test. `scripts/life-replay/evaluator.ts:102`

| Start      | Mode | Steps | Labels only | Reproduced | Outside bounds | Unmeasured bounds | First broken link |
| ---------- | ---- | ----- | ----------- | ---------- | -------------- | ----------------- | ----------------- |
| 1978-10-15 | god  | 14    | 14          | 0          | 0              | 2                 | father-dies       |
| 1978-10-15 | free | 14    | 14          | 0          | 0              | 2                 | father-dies       |
| 2021-01-01 | god  | 14    | 14          | 0          | 0              | 2                 | governor-campaign |
| 2021-01-01 | free | 14    | 14          | 0          | 0              | 2                 | governor-campaign |

Measured: god mode from October 15, 1978 forced 0 of 4 documented decisions. An unavailable choice stays a gap. `scripts/life-replay/runner.ts:337`

Measured: god from January 1, 2021 supplied 10 past steps; 0 had verified active state. The first later break was governor-campaign. `scripts/life-replay/evaluator.ts:177`

Measured: god mode from January 1, 2021 forced 0 of 1 documented decisions. An unavailable choice stays a gap. `scripts/life-replay/runner.ts:337`

Measured: free from January 1, 2021 supplied 10 past steps; 0 had verified active state. The first later break was governor-campaign. `scripts/life-replay/evaluator.ts:177`

Measured: all supported steps below have generic event-label storage. The capability probe runs the canonical event writer on a discarded fork. It proves label storage, without validating the factual payload or changing the live world. `scripts/life-replay/old-core.ts:393`

Measured: initialization creates one subject and a birthplace. Family, employers, offices, and an electorate remain absent. Past checkpoint labels do not initialize active education, jobs, residences, or offices. `scripts/life-replay/old-core.ts:110`

Measured: era inputs and external events create audit labels without running state-changing handlers. The result is an adapter gap; native law and election systems were not exercised by this world. `scripts/life-replay/old-core.ts:207`

Inferred: god mode can control available native life-situation choices, but the adapter cannot interrupt internal old-clock decisions. Documented career actions need bindings to actual enabled decisions before their consequences can be tested. `scripts/life-replay/old-core.ts:246`

Measured: prior links remain broken until their results or initialized past state are verified. The dependency list is a continuity check, not a claim that one historical event caused another. `scripts/life-replay/evaluator.ts:165`

| Documented step              | Required mechanism   | Source date window            | god                            | free                           | Public evidence                                                                                                                                                                                                                                                       |
| ---------------------------- | -------------------- | ----------------------------- | ------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| father dies (event)          | family loss          | 1981-10-15 through 1982-10-14 | Label only; no matching result | Label only; no matching result | [Maryland Governor’s Office](https://governor.maryland.gov/leadership/governor-wes-moore)                                                                                                                                                                             |
| move to grandparents (event) | residence move       | 1981-10-15 through 1992-10-14 | Label only; no matching result | Label only; no matching result | [Maryland Governor’s Office](https://governor.maryland.gov/leadership/governor-wes-moore)                                                                                                                                                                             |
| return to maryland (event)   | residence move       | 1992-10-15 through 1993-10-14 | Label only; no matching result | Label only; no matching result | [Maryland State Archives](https://msa.maryland.gov/msa/mdmanual/08conoff/gov/html/msa18374.html); [Wes Moore campaign, republishing The Baltimore Sun](https://wesmoore.com/wes-moore-author-and-former-nonprofit-executive-launches-campaign-for-maryland-governor/) |
| military college (outcome)   | education completion | 1998-01-01 through 1998-12-31 | Label only; no matching result | Label only; no matching result | [Maryland State Archives](https://msa.maryland.gov/msa/mdmanual/08conoff/gov/html/msa18374.html)                                                                                                                                                                      |
| army commission (decision)   | military service     | 1998-01-01 through 1998-12-31 | Label only; no matching result | Label only; no matching result | [Maryland Governor’s Office](https://governor.maryland.gov/leadership/governor-wes-moore)                                                                                                                                                                             |
| johns hopkins (outcome)      | education completion | 2001-01-01 through 2001-12-31 | Label only; no matching result | Label only; no matching result | [Maryland State Archives](https://msa.maryland.gov/msa/mdmanual/08conoff/gov/html/msa18374.html)                                                                                                                                                                      |
| oxford (outcome)             | education completion | 2004-01-01 through 2004-12-31 | Label only; no matching result | Label only; no matching result | [Maryland State Archives](https://msa.maryland.gov/msa/mdmanual/08conoff/gov/html/msa18374.html)                                                                                                                                                                      |
| afghanistan (event)          | military deployment  | 2005-01-01 through 2005-12-31 | Label only; no matching result | Label only; no matching result | [Maryland Governor’s Office](https://governor.maryland.gov/leadership/governor-wes-moore)                                                                                                                                                                             |
| bridge edu (decision)        | business formation   | 2014-01-01 through 2014-12-31 | Label only; no matching result | Label only; no matching result | [Maryland State Archives](https://msa.maryland.gov/msa/mdmanual/08conoff/gov/html/msa18374.html)                                                                                                                                                                      |
| robin hood (decision)        | employment           | 2017-01-01 through 2017-12-31 | Label only; no matching result | Label only; no matching result | [Maryland State Archives](https://msa.maryland.gov/msa/mdmanual/08conoff/gov/html/msa18374.html)                                                                                                                                                                      |
| governor campaign (decision) | candidacy            | 2021-06-07 through 2021-06-07 | Label only; no matching result | Label only; no matching result | [Wes Moore campaign, republishing The Baltimore Sun](https://wesmoore.com/wes-moore-author-and-former-nonprofit-executive-launches-campaign-for-maryland-governor/)                                                                                                   |
| primary win (outcome)        | election result      | 2022-07-19 through 2022-07-19 | Label only; no matching result | Label only; no matching result | [Maryland State Board of Elections](https://elections.maryland.gov/elections/archive/2022/primary_results/gen_results_2022_1.html)                                                                                                                                    |
| general win (outcome)        | election result      | 2022-11-08 through 2022-11-08 | Label only; no matching result | Label only; no matching result | [Maryland State Board of Elections](https://elections.maryland.gov/elections/archive/2022/general_results/gen_results_2022_1.html)                                                                                                                                    |
| governor service (outcome)   | office service       | 2023-01-18 through 2023-01-18 | Label only; no matching result | Label only; no matching result | [Maryland State Archives](https://msa.maryland.gov/msa/mdmanual/08conoff/gov/html/msa18374.html)                                                                                                                                                                      |

## Numbers and background

Measured: god from October 15, 1978: numeric checks 2; outside bounds 0; unmeasured 2. `scripts/life-replay/evaluator.ts:125`

- primary-win, election.voteSharePercent: unmeasured; actual unavailable, minimum 32.41, maximum 32.41.
- general-win, election.voteSharePercent: unmeasured; actual unavailable, minimum 64.53, maximum 64.53.

Measured: free from October 15, 1978: numeric checks 2; outside bounds 0; unmeasured 2. `scripts/life-replay/evaluator.ts:125`

- primary-win, election.voteSharePercent: unmeasured; actual unavailable, minimum 32.41, maximum 32.41.
- general-win, election.voteSharePercent: unmeasured; actual unavailable, minimum 64.53, maximum 64.53.

Measured: god from January 1, 2021: numeric checks 2; outside bounds 0; unmeasured 2. `scripts/life-replay/evaluator.ts:125`

- primary-win, election.voteSharePercent: unmeasured; actual unavailable, minimum 32.41, maximum 32.41.
- general-win, election.voteSharePercent: unmeasured; actual unavailable, minimum 64.53, maximum 64.53.

Measured: free from January 1, 2021: numeric checks 2; outside bounds 0; unmeasured 2. `scripts/life-replay/evaluator.ts:125`

- primary-win, election.voteSharePercent: unmeasured; actual unavailable, minimum 32.41, maximum 32.41.
- general-win, election.voteSharePercent: unmeasured; actual unavailable, minimum 64.53, maximum 64.53.

Historical point targets are exact comparisons, not population ranges. Legal age bounds test eligibility only. An unmeasured number does not pass the bound.

The source file lists these public-data gaps:

- family.exact-income-and-balances: Not established by the cited public sources; no value supplied to the core.
- parents.faith: Not established by the cited public sources; no value supplied to the core.
- person.numeric-traits-and-private-beliefs: Not established by the cited public sources; no value supplied to the core.

Inferred: retrospective annual statistics, adult faith descriptions, and endogenous later law outcomes must remain references rather than early world inputs. The runner excludes rows marked as references. `scripts/life-replay/runner.ts:186`

## What happens next

P9 supplies the sourced data, runner, evaluator, and these gaps. P8 owns world initialization, typed event handlers, ordinary decision scoring, and measured consequences. Each missing binding must expose actual records through the versioned interface before the same replay can validate it.

The mechanisms this life needs are family-loss, residence-move, education-completion, military-service, military-deployment, business-formation, employment, candidacy, election-result, office-service. Unavailable facts remain explicit gaps; they must not become invented private attributes.

## Method

Diagnostic audit run in the worker's cloud environment. No player screen was exercised. Each receipt came from its own Node subprocess with a documented timeout. The life files and public citations remain developer data.

- god, October 15, 1978 through January 18, 2023: 16,166 simulated days; horizon complete. Runner time: 1,351 milliseconds. Peak process RSS: 968,044,544 bytes. Receipt: [wes-moore.birth.god.json](receipts/wes-moore.birth.god.json). Core revision: 19f63909a59b3227ef18dd92476aff1b53bff696.
- free, October 15, 1978 through January 18, 2023: 16,166 simulated days; horizon complete. Runner time: 1,331 milliseconds. Peak process RSS: 1,022,529,536 bytes. Receipt: [wes-moore.birth.free.json](receipts/wes-moore.birth.free.json). Core revision: 19f63909a59b3227ef18dd92476aff1b53bff696.
- god, January 1, 2021 through January 18, 2023: 747 simulated days; horizon complete. Runner time: 140 milliseconds. Peak process RSS: 882,515,968 bytes. Receipt: [wes-moore.modern-start.god.json](receipts/wes-moore.modern-start.god.json). Core revision: 19f63909a59b3227ef18dd92476aff1b53bff696.
- free, January 1, 2021 through January 18, 2023: 747 simulated days; horizon complete. Runner time: 147 milliseconds. Peak process RSS: 853,028,864 bytes. Receipt: [wes-moore.modern-start.free.json](receipts/wes-moore.modern-start.free.json). Core revision: 19f63909a59b3227ef18dd92476aff1b53bff696.

Runner time excludes module import and subprocess startup. Peak RSS includes the process lifetime. A one-subject world without ordinary scheduled population activity cannot establish normal-year throughput. Adjacent manifests record the source hashes, Node version, and whether the measured source was clean.
