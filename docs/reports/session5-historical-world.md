# Earlier worlds use dated inputs, but the populated past is still too large

Earlier worlds now use dated wages, prices, laws and congressional allocations. The populated life-start test remains above the two-minute limit. The ordinary populated route exhausted the heap while saving. The current historical route completed two years, then stopped because a constitutional vote lacked a quorum. This work is a checkpoint for the other life-start sessions; it is not ready for acceptance or merging.

## What changed

Measured: the historical wage test supplies positive floors for all 56 places in every year from 2021 through 2025. The reader in [`historical-world-inputs.ts:63`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/simulation/historical-world-inputs.ts#L63) gives existing dated observations priority. It marks missing historical observations as estimates derived from recorded rates and price drift.

Measured: the electoral tests cover the previous House allocation and the 2020 presidential allocation. The dated seat reader in [`congress-seats.ts:113`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/simulation/living-world/congress-seats.ts#L113) retains the previous allocation until the January 2023 term. Political preparation covers retired districts and labels their same-state House means as estimates.

Measured: the existing institution pipeline opens a historical world. The optional supplied-game argument in [`opening-life.ts:156`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/presentation/opening-life.ts#L156) retains the supplied world and character. Session 7 owns the surrounding loading orchestration and has an equivalent institution adapter.

The lighter historical mode uses the same Observer clock and financial writers. Distant office pay now becomes monthly statements. The player, recorded contacts and people living or working in touched towns retain ordinary payroll. Measured: the payroll regression preserves original weekly gross amounts, canonical residence and commuter exemptions, and repeated-settlement behavior. The writer sums each job's own dated terms; it does not use a town average. See the [monthly producer receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006680145).

Measured: repeated distant historical tax observations account for most financial records in the current run. The published tax repair retains the first actual unknown or not-imposed observation per authority, rule and month. It preserves every assessed liability and payment. It does not assign a zero amount to unknown taxes. Ordinary payroll keeps its source assessments. The [tax repair receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6007355291) includes the checked source and its regression results. This repair has not been timed in a populated run.

The streamed writer uses the existing stored form and JSON writer without retaining a second complete text payload. Its annual byte measurement is reported separately from the clock.

## What the timing establishes

The requested initial run used a seeded random place: Opelousas, Louisiana. That existing pre-start world contained 64 people. Its results establish the sparse world's speed, not the populated life-start route. The [initial receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6004130074) contains the annual table below.

| Period            | Clock seconds | Saved bytes |
| ----------------- | ------------: | ----------: |
| 2021              |         0.122 |     920,319 |
| 2022              |         0.050 |     949,563 |
| 2023              |         0.040 |     999,041 |
| 2024              |         0.041 |   1,047,926 |
| 2025              |         0.040 |   1,096,057 |
| January 1–4, 2026 |         0.001 |   1,096,818 |

Measured: the populated shared-seed opening in Wabash County, Illinois contained 9,421 people. Advancing through 2021 took 211.015 seconds and reached 11,019 people. Serialization then exhausted a 4 GiB heap and exited with code 134. It produced no complete annual save-size receipt. See the [terminal OOM receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6004747317).

Measured: a later bounded 30-day run took 10.934 seconds. Its serialized save contained 274,905,192 bytes, with 266,148 statutory tax liabilities. Heap usage before saving was 641,482,672 bytes. This is a month receipt, not five-year acceptance. Timing runs were diagnostic; other validation work occurred during some runs, so they are not a controlled speed comparison. See [month-repair.log:45](/workspace/session5-integration-proof/test-results/session5/month-repair.log:45).

Measured: the streamed ordinary first year took 188.602 clock seconds and contained 2,825,472,419 saved bytes. Measuring those bytes took another 61.394 seconds without retaining a duplicate payload. Heap usage was 3,157,729,088 bytes. See the [streamed annual receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6005044026).

Measured: the lighter populated first year took 69.171 clock seconds and contained 121,217,981 saved bytes. Measurement took another 2.567 seconds. Heap usage was 596,844,704 bytes; resident memory was about 1.323 GB. These are diagnostic receipts, not a controlled baseline comparison or a five-year result. See [past-five-years-fixed.log:57](/workspace/session5-integration-proof/test-results/session5/past-five-years-fixed.log:57).

Measured: the preserved run reached the November 8, 2022 election boundary. A read-only snapshot contained 66,537 tax liabilities, 60,636 personality tendencies, 11,130 decision traces and 7,386 transfer outcomes. Its 37,406 crisis rows mostly recorded health episodes, disclosures, states and coverage. Those meaningful records remain intact. This is a dated checkpoint, not annual growth. See the [record-kind receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6005417048).

Measured: an intake profile spent about 17 of 30 sampled seconds rebuilding dated household cohorts. An election profile spent 13.569 of 30.909 sampled seconds scanning decision history for an actor's prior choice. The published repairs reuse cohorts for identical immutable inputs, index actor traces, batch salary writes, and reuse canonical electorates in their original voter order. Those earlier reader and batch repairs were included in the current diagnostic run. Their individual speed effects were not isolated. The [profile receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6005269425) records the dominant reads.

## Current populated result

Measured: the current public life factory opened Paul Cole in Wabash County at age 62, with 9,421 people. The same seed, place and age were used for earlier populated diagnostics. The character and world IDs changed with the public factory, so these runs do not establish a controlled speed ratio. The [terminal receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6007366119) records the two completed years.

| Period | Clock seconds |   Saved bytes | Byte-measurement seconds |
| ------ | ------------: | ------------: | -----------------------: |
| 2021   |       119.379 |   829,871,593 |                   17.133 |
| 2022   |       593.336 | 1,769,785,431 |                   37.298 |

Measured: the 2022 checkpoint contained 1,529,955 statutory tax liabilities, 177,291 flows, 347,126 terms and 169,834 transfers. It also retained 11,260 decisions, 391 deaths and 428 functional-capacity records. Heap usage was 3,010,511,552 bytes; resident memory was 3,802,718,208 bytes. The two-year clock alone exceeds the full five-year limit.

Measured: a read-only query at January 28, 2022 found 798,444 tax liabilities. Of those, 781,308 had unknown rules, 756 had unknown bases, and 16,380 were not imposed with zero liability. Every row had collection set to none. The tax repair targets those repeated routine observations. It keeps actual assessed debts and payments. See the [same-run histogram](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6007238047).

Measured: a bounded payroll sample spent 7.601 of 10.755 seconds in the payday handler. A later election sample spent 2.941 of 11.233 seconds scanning federal tenure history. Session 13 owns the narrow federal-office reader index. Session 20 owns the constitutional writer input failure. The vote guard remains intact; no occupants or quorum were manufactured. See the [reader handoff](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6007335579).

## What remains open

The populated five-year run, two-minute cap, terminal same-world handoff, save/continue, printed journal and research-range checks remain unproved. The loading clip belongs to Session 7. No READY claim is made.

Historical wage annual alignment and missing law observations remain estimates. They are labeled in developer records. Previous district boundaries are not reconstructed; institutional seat counts are dated, and missing political observations use labeled same-state estimates.

## Method and retained evidence

The original sparse seed was `session5-20261005-historical-world`. The populated seed was `session6-birth-resident-handoff`. Place and age came from the repository's seeded helpers. Diagnostic logs and scripts remain under `test-results/session5` in both worktrees.

Measured: the older retained run on `14747a3a1` completed 2022 in 5,280.747 seconds, with 344,959,627 saved bytes. It was stopped after that annual boundary with exit code 143. Its earlier life packet preserves existing events and family records; no scenes were fabricated. See the [old annual terminal receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006634467).

Measured: the current immutable run on `e52239f01` used the published loading composition and residence protections. It ran with a 4 GiB heap. It completed annual receipts through January 1, 2023, then exited with code 1 during further processing. The constitutional roll call lacked actual presence and quorum. This was an integrity failure, not an out-of-memory exit. Profiles and a read-only query ran on that same process. Some focused validation ran concurrently, so this remains diagnostic handler timing, not a controlled comparison.

Measured: composed source `e52239f01` passed full typing and 29 payroll, character and transport tests before timing. Producer tax repair `61703e95d` passed application typing, lint, formatting and all 9 payroll regressions. Two ordinary statutory-tax fixtures failed identically with the repair and unchanged source. Their shop-pay expectations remain unresolved; no whole-suite PASS is claimed.

The tax repair is published for Sessions 6 and 7. Its consumer integration and populated speed remain unmeasured. The benchmark process is terminal; there is no live annual run. A new run will use actual published owner fixes after composition checks. No ordinary-main OOM job has been restarted.
