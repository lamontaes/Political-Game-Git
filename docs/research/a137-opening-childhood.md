# Opening childhood money comes from records and a marked backcast

Recorded childhood facts take priority. An opening adult without childhood household accounts now receives an estimated family-money background from recorded opening household job/pay, recorded birthplace and childhood year. The estimate uses published income-rank and child-poverty summaries. It creates no illness, family conflict, separation, school incident or first-job event. This estimate does not recover a person's actual childhood.

## Published evidence

Chetty, Hendren, Kline and Saez, _Where Is the Land of Opportunity?_ (2014), report a national child/parent income-rank correlation of **0.341**, using the 1980–82 birth cohorts. Figure IIa and Table I describe the forward association. National parent and child ranks have the same variance, so the best **linear reverse predictor** is `50 + 0.341 × (adult rank − 50)`. Dividing by 0.341 would wrongly invert a noisy association as a deterministic history. The reverse predictor is an approximation, not an observed conditional distribution or a statement that adult poverty proves childhood poverty.

- [Paper](https://opportunityinsights.org/wp-content/uploads/2018/03/mobility_geo.pdf).
- [Published national income-percentile table](https://opportunityinsights.org/wp-content/uploads/2018/04/Statistics_By_Parent_or_child_Income_Percentile.xlsx), sheet “By Child Income Percentile”: child-family income and centile. SHA-256 `2fb55831b8c5190eb93c403a0134715acbc9979e62b462863716fc8ce057d41e`.
- [Published commuting-zone measures](https://opportunityinsights.org/wp-content/uploads/2018/04/preferred_measures.xlsx) identify a _forward_ slope and upward mobility. No verified birthplace-to-CZ crosswalk was obtained within the research cap; this implementation uses the national correlation throughout, and never guesses a CZ from a town name.
- [Census SAIPE 2010 state/county summary](https://www2.census.gov/programs-surveys/saipe/datasets/2010/2010-state-and-county/est10all.txt), state rows (`county=0`), under-18 poverty percent. SHA-256 `3aff510e67a2260b52dcb0388d1836e3866cbaec17aa5984cca283b03146c1b6`.
- [Census SAIPE 2023 state/county summary](https://www2.census.gov/programs-surveys/saipe/datasets/2023/2023-state-and-county/est23all.txt), same extraction. SHA-256 `630fa63ab002ef6e78c5dde6783619641b4c5ef480d494f2e3f1dc35e939de27`.
- [Census historical poverty table 3](https://www2.census.gov/programs-surveys/cps/tables/time-series/historical-poverty-people/hstpov3.xlsx), All Races, under-18 percent in poverty, observations through 2023. SHA-256 `834eb03406d16cee93df31a569b31f5c1be408b27268c05954c3e80f19d202c6`.

The checked SAIPE summaries report national child poverty at **21.6% in 2010** and **16.0% in 2023**. These are measurements of children, not outcomes assigned to an actor. Source extracts are compiled into `upbringing-income-data.ts`; they require no network or spreadsheet parser in the game.

## Estimate and limits

Recorded opening household pay is normalized by the household's recorded size and HHS guideline, then multiplied by the 2012 four-person guideline of $23,050 to place it on the income table's scale. Linear interpolation supplies an adult-family-income centile. This normalization is a model assumption: pay omits transfers, investment income and other nonpay resources, and contemporary household size is not the study's actual family unit. Without an adult or complete recorded payroll for working household members, the adult rank is 50, marked as a median estimate; absence of payroll is not zero income.

The birthplace record selects a state poverty observation. Each childhood period uses birth year plus its midpoint age (3 or 15). The nearest available state vintage is scaled by the ratio of national CPS child poverty in the nearest childhood year to that in the state observation's year. This is a disclosed state/cohort estimate, **not observed state poverty for that childhood**. Dates outside national coverage use the nearest measured year. The five territories have no SAIPE state rows here and use an explicitly marked national proxy. Missing birthplace coverage does the same.

The existing family-money labels remain: poverty, below twice poverty, and at least twice poverty. The national ACS 2024 B17024 low-income/poverty ratio already documented in the reader estimates the second boundary from the local poverty share. These ranks classify an estimated background; they never decide an actor's event or choice. The continuous estimated parent rank is retained alongside the label for inspection. Regression toward the mean deliberately narrows estimates; this is **not** a reconstruction of the full childhood-income distribution.

Individual caregiving and school experiences stay unrecorded when their producers recorded none. Recorded childhood moves and parent deaths remain authoritative. People born in play keep their existing childhood-record path and household-pay reader. Existing persisted personalities are not rewritten by this change.

## Delivery and verification

The focused fixture samples all 56 real place identities, names its seed, requires more than one money label across opening places/cohorts, reads two recorded pay levels, checks birthplace against current residence, and proves recorded childhood money wins. It also checks that reading does not mutate the world and that identical records give identical results under a different world seed. Claude owns the independent gate; local results belong to their exact source checkpoint.

Research was bounded to published summary tables under the owner's 15-minute cap. The Census API returned a missing-key response; no private credentials or estimated replacement state rows were used.
