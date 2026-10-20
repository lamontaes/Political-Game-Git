# Homeschool state shares: shrinkage against the replicate-weight errors (Oct 20, 2026)

Pool item `people-homeschool-share-recheck-shrinkage`. Method: `scripts/research/homeschool-share-replicate-errors.py` rebuilds each state's share from the Household Pulse public-use files for weeks 53 to 63 of 2023 and takes the error over the survey's 80 replicate weights. It reproduces the shipped shares to four decimals (51 of 51 places). The errors are in `data/research/people/census-household-pulse-homeschool-replicate-errors-2023.json`.

## What I found

- **The branch ships no shrinkage.** `data/research/people/census-household-pulse-homeschool-share-2023.json` (PR #5493) holds each state's raw share and `opening-private-tuition.ts` reads it directly. The "pull of 40 household records" in this item's question is therefore a proposal, not code; I tested it as one.
- **The simple error understates the real one.** The shipped error is the simple one for the number of households. The replicate error is larger in most states (the median simple-to-replicate ratio is 0.81, so the real error is about a quarter larger).
- **A pull of 40 households does almost nothing.** Each state has 1,700 to 4,400 households, so pulling 40 records toward the national 0.0451 moves a state's share by at most 0.0011 (0.11 points), against replicate errors of 0.0025 to 0.0106. It is smaller than the sampling error everywhere.
- **The states really do differ.** The spread between states (standard deviation 0.0144) is about three times the average replicate error (0.0052). After the 40-pull, only 15 of 51 states sit within one standard error of the national share; the other 36 differ from it by more than their own error, so heavy shrinkage toward the national share would erase real differences (Alaska at 11.6 percent, Massachusetts at 2.5 percent).

## Drawn place

Harmony, Rhode Island (place 4433040; seed `c8ce942b105c77adda7d67ea1ad846b28ed0ba71c3b2a2e2ed154f881554360f`, purpose `homeschool-share`, drawn with `drawPlace`). Table row US-RI: raw share 0.0257, replicate error 0.0054 (simple 0.0042), 40-record pull 0.0262, national 0.0451. Rhode Island sits 3.5 standard errors below the national share, so it is a real difference and stays.

## Pull value: kept or changed

**No hand pull.** Keep the raw state shares for the states whose replicate error is small beside the between-state spread, which is nearly all of them. Where a state's error is large (Alaska 0.0106, the District 0.0070, Montana 0.0073, North Carolina 0.0068), pull by the empirical-Bayes weight w = τ² / (τ² + error²), with τ = 0.0144 from the table below: Alaska keeps 0.65 of its own share, the District 0.81. That is a per-state formula with no constant of its own. If the owner wants a flat pull anyway, the empirical-Bayes weights imply about 320 households of pull (median), not 40.

This is a recommendation for the builder of PR #5493; I did not change its data or code, since it is on another branch and its base has since moved on main. The private-tuition total is calibrated by the share and never decides whether one family homeschools, so the choice moves a town's tuition total by well under one percent either way.

## Table (51 states and the District)

| State | Raw share | Replicate error | Simple error | After 40-pull | Within 1 error of national | Empirical-Bayes weight on own share |
| ----- | --------- | --------------- | ------------ | ------------- | -------------------------- | ----------------------------------- |
| AL    | 0.0569    | 0.0064          | 0.0046       | 0.0567        | no                         | 0.84                                |
| AK    | 0.1160    | 0.0106          | 0.0064       | 0.1149        | no                         | 0.65                                |
| AZ    | 0.0418    | 0.0032          | 0.0030       | 0.0419        | no                         | 0.95                                |
| AR    | 0.0612    | 0.0056          | 0.0047       | 0.0610        | no                         | 0.87                                |
| CA    | 0.0392    | 0.0033          | 0.0018       | 0.0392        | no                         | 0.95                                |
| CO    | 0.0459    | 0.0039          | 0.0033       | 0.0459        | yes                        | 0.93                                |
| CT    | 0.0285    | 0.0035          | 0.0031       | 0.0287        | no                         | 0.94                                |
| DE    | 0.0335    | 0.0050          | 0.0045       | 0.0338        | no                         | 0.89                                |
| DC    | 0.0312    | 0.0070          | 0.0042       | 0.0316        | no                         | 0.81                                |
| FL    | 0.0538    | 0.0049          | 0.0033       | 0.0537        | no                         | 0.90                                |
| GA    | 0.0512    | 0.0040          | 0.0033       | 0.0512        | no                         | 0.93                                |
| HI    | 0.0488    | 0.0076          | 0.0053       | 0.0487        | yes                        | 0.78                                |
| ID    | 0.0612    | 0.0047          | 0.0036       | 0.0611        | no                         | 0.90                                |
| IL    | 0.0372    | 0.0031          | 0.0030       | 0.0373        | no                         | 0.96                                |
| IN    | 0.0533    | 0.0037          | 0.0039       | 0.0533        | no                         | 0.94                                |
| IA    | 0.0330    | 0.0037          | 0.0032       | 0.0332        | no                         | 0.94                                |
| KS    | 0.0423    | 0.0042          | 0.0034       | 0.0424        | yes                        | 0.92                                |
| KY    | 0.0498    | 0.0051          | 0.0041       | 0.0497        | yes                        | 0.89                                |
| LA    | 0.0437    | 0.0052          | 0.0041       | 0.0437        | yes                        | 0.89                                |
| ME    | 0.0440    | 0.0055          | 0.0048       | 0.0440        | yes                        | 0.87                                |
| MD    | 0.0408    | 0.0038          | 0.0031       | 0.0408        | no                         | 0.93                                |
| MA    | 0.0246    | 0.0036          | 0.0025       | 0.0248        | no                         | 0.94                                |
| MI    | 0.0420    | 0.0033          | 0.0028       | 0.0420        | yes                        | 0.95                                |
| MN    | 0.0287    | 0.0027          | 0.0027       | 0.0289        | no                         | 0.97                                |
| MS    | 0.0604    | 0.0056          | 0.0050       | 0.0602        | no                         | 0.87                                |
| MO    | 0.0680    | 0.0056          | 0.0044       | 0.0677        | no                         | 0.87                                |
| MT    | 0.0629    | 0.0073          | 0.0051       | 0.0626        | no                         | 0.80                                |
| NE    | 0.0328    | 0.0036          | 0.0030       | 0.0329        | no                         | 0.94                                |
| NV    | 0.0470    | 0.0051          | 0.0044       | 0.0470        | yes                        | 0.89                                |
| NH    | 0.0512    | 0.0059          | 0.0046       | 0.0511        | no                         | 0.86                                |
| NJ    | 0.0254    | 0.0036          | 0.0028       | 0.0257        | no                         | 0.94                                |
| NM    | 0.0528    | 0.0047          | 0.0041       | 0.0527        | no                         | 0.91                                |
| NY    | 0.0249    | 0.0045          | 0.0030       | 0.0251        | no                         | 0.91                                |
| NC    | 0.0554    | 0.0068          | 0.0042       | 0.0553        | no                         | 0.82                                |
| ND    | 0.0429    | 0.0053          | 0.0046       | 0.0429        | yes                        | 0.88                                |
| OH    | 0.0417    | 0.0051          | 0.0037       | 0.0418        | yes                        | 0.89                                |
| OK    | 0.0530    | 0.0053          | 0.0039       | 0.0529        | no                         | 0.88                                |
| OR    | 0.0565    | 0.0043          | 0.0036       | 0.0564        | no                         | 0.92                                |
| PA    | 0.0400    | 0.0039          | 0.0031       | 0.0400        | no                         | 0.93                                |
| RI    | 0.0257    | 0.0054          | 0.0042       | 0.0262        | no                         | 0.88                                |
| SC    | 0.0539    | 0.0050          | 0.0044       | 0.0538        | no                         | 0.89                                |
| SD    | 0.0441    | 0.0056          | 0.0043       | 0.0441        | yes                        | 0.87                                |
| TN    | 0.0764    | 0.0051          | 0.0046       | 0.0761        | no                         | 0.89                                |
| TX    | 0.0466    | 0.0033          | 0.0022       | 0.0466        | yes                        | 0.95                                |
| UT    | 0.0468    | 0.0034          | 0.0028       | 0.0467        | yes                        | 0.95                                |
| VT    | 0.0472    | 0.0092          | 0.0049       | 0.0472        | yes                        | 0.71                                |
| VA    | 0.0596    | 0.0047          | 0.0035       | 0.0595        | no                         | 0.90                                |
| WA    | 0.0499    | 0.0040          | 0.0026       | 0.0499        | no                         | 0.93                                |
| WV    | 0.0614    | 0.0059          | 0.0051       | 0.0611        | no                         | 0.86                                |
| WI    | 0.0360    | 0.0036          | 0.0034       | 0.0361        | no                         | 0.94                                |
| WY    | 0.0488    | 0.0057          | 0.0049       | 0.0487        | yes                        | 0.87                                |
