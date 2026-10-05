# Earlier worlds use dated inputs, but the populated past is still too large

Earlier worlds now use dated wages, prices, laws and congressional allocations. The populated life-start test remains above the two-minute limit. The ordinary populated route exhausted the heap while saving. The lighter historical route completed its first year, but the next year remains unfinished. This work is a checkpoint for the other life-start sessions; it is not ready for acceptance or merging.

## What changed

Measured: the historical wage test supplies positive floors for all 56 places in every year from 2021 through 2025. The reader in [`historical-world-inputs.ts:63`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/simulation/historical-world-inputs.ts#L63) gives existing dated observations priority. It marks missing historical observations as estimates derived from recorded rates and price drift.

Measured: the electoral tests cover the previous House allocation and the 2020 presidential allocation. The dated seat reader in [`congress-seats.ts:113`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/simulation/living-world/congress-seats.ts#L113) retains the previous allocation until the January 2023 term. Political preparation covers retired districts and labels their same-state House means as estimates.

Measured: the existing institution pipeline opens a historical world. The optional supplied-game argument in [`opening-life.ts:156`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/presentation/opening-life.ts#L156) retains the supplied world and character. Session 7 owns the surrounding loading orchestration and has an equivalent institution adapter.

The lighter historical mode uses the same Observer clock and financial writers. Distant office pay becomes annual statements. Nearby residents, relatives, contacts and people with private goals retain ordinary payroll. Inferred from the preserved clock path: existing records remain intact, and decisions and meaningful records continue through the same handlers. Annual statements sum the original dated weekly amounts. Their cash and tax settlement occurs later than ordinary weekly settlement, an approved historical approximation. See [`office-salary.ts:324`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/simulation/office-salary.ts#L324). The streamed writer in [`serialization.ts:167`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/simulation/serialization.ts#L167) uses the existing stored form and JSON writer without retaining a second payload.

## What the timing establishes

The requested initial run used a seeded random place: Opelousas, Louisiana. That existing pre-start world contained 64 people. Its results establish the sparse world's speed, not the populated life-start route. The [initial receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6004130074) contains the annual table below.

| Period | Clock seconds | Saved bytes |
| --- | ---: | ---: |
| 2021 | 0.122 | 920,319 |
| 2022 | 0.050 | 949,563 |
| 2023 | 0.040 | 999,041 |
| 2024 | 0.041 | 1,047,926 |
| 2025 | 0.040 | 1,096,057 |
| January 1–4, 2026 | 0.001 | 1,096,818 |

Measured: the populated shared-seed opening in Wabash County, Illinois contained 9,421 people. Advancing through 2021 took 211.015 seconds and reached 11,019 people. Serialization then exhausted a 4 GiB heap and exited with code 134. It produced no complete annual save-size receipt. See the [terminal OOM receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6004747317).

Measured: a later bounded 30-day run took 10.934 seconds. Its serialized save contained 274,905,192 bytes, with 266,148 statutory tax liabilities. Heap usage before saving was 641,482,672 bytes. This is a month receipt, not five-year acceptance. Timing runs were diagnostic; other validation work occurred during some runs, so they are not a controlled speed comparison. See [month-repair.log:45](/workspace/session5-integration-proof/test-results/session5/month-repair.log:45).

Measured: the streamed ordinary first year took 188.602 clock seconds and contained 2,825,472,419 saved bytes. Measuring those bytes took another 61.394 seconds without retaining a duplicate payload. Heap usage was 3,157,729,088 bytes. See the [streamed annual receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6005044026).

Measured: the lighter populated first year took 69.171 clock seconds and contained 121,217,981 saved bytes. Measurement took another 2.567 seconds. Heap usage was 596,844,704 bytes; resident memory was about 1.323 GB. These are diagnostic receipts, not a controlled baseline comparison or a five-year result. See [past-five-years-fixed.log:57](/workspace/session5-integration-proof/test-results/session5/past-five-years-fixed.log:57).

Measured: the preserved run reached the November 8, 2022 election boundary. A read-only snapshot contained 66,537 tax liabilities, 60,636 personality tendencies, 11,130 decision traces and 7,386 transfer outcomes. Its 37,406 crisis rows mostly recorded health episodes, disclosures, states and coverage. Those meaningful records remain intact. This is a dated checkpoint, not annual growth. See the [record-kind receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6005417048).

Measured: an intake profile spent about 17 of 30 sampled seconds rebuilding dated household cohorts. An election profile spent 13.569 of 30.909 sampled seconds scanning decision history for an actor's prior choice. The published repairs reuse cohorts for identical immutable inputs, index actor traces, batch salary writes, and reuse canonical electorates in their original voter order. These repairs are not yet timed in the populated run. The [profile receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6005269425) records the dominant reads.

## What remains open

The populated five-year run, two-minute cap, terminal same-world handoff, printed journal and research-range checks remain unproved. The loading clip belongs to Session 7. No READY claim is made.

Historical wage annual alignment and missing law observations remain estimates. They are labeled in developer records. Previous district boundaries are not reconstructed; the institutional seat counts are dated, and missing political observations use labeled same-state estimates.

## Method and retained evidence

The original sparse seed was `session5-20261005-historical-world`. The populated shared seed was `session6-birth-resident-handoff`; place and age were independently drawn through the repository's seeded helpers. Both paths used the existing Observer clock. Diagnostic logs and scripts remain under `test-results/session5` in the primary and integration worktrees.

Measured: 23 focused payroll, upbringing and eligibility tests pass after the producer type repair. Decision and peer-estimate tests pass. The election suite's same 12 failures reproduce on unchanged main. The upbringing-traits fixture's empty donor-pair failure also reproduces there. Earlier broader tax and opening failures were compared separately with main. See [producer-repair-tests.log:6](/workspace/Political-Game-Git/test-results/session5/producer-repair-tests.log:6) for the 23-test terminal result.

The application typecheck completes successfully. Complete repository typing stops at four existing opening-preparation test diagnostics owned by Session 7's separate prerequisite. Earlier typecheck PASS updates were sent before the command completed; the terminal failure was corrected, and the producer-owned errors are repaired. Zero-dice passes with no new draws. See [full-typecheck-latest.log:6](/workspace/Political-Game-Git/test-results/session5/full-typecheck-latest.log:6) for the remaining full-typing diagnostics.

Published producer head: `16553ecf5`. Its [repair handoff](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6005417048) identifies the closure, eligibility and type dependencies. Session 6 confirmed its received annual-closure composition passed 15 payroll and character tests. Its newer composition contains the latest producer head. The [consumer receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6005504598) confirms 28 affected tests pass and complete typing exits successfully on Session 6 composition `5b995bc89`. Session 7 owns the institution adapter and loading orchestration.

The sole live populated timing run remains on integration `14747a3a1`, before the newest repairs. Its terminal 2022 receipt, final cap proof, journal and range validation remain open. No ordinary-main OOM job has been restarted.
