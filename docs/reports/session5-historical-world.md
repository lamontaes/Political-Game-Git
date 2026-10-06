# Earlier worlds use dated inputs, but the populated past is still too large

Earlier worlds now use dated wages, prices, laws and congressional allocations. The populated life-start test remains above the two-minute limit. The ordinary populated route exhausted the heap while saving. The latest historical route completed the requested five years and wrote a canonical save, but preparation remains far above the limit. This work is a checkpoint for the other life-start sessions; it is not ready for acceptance or merging.

## What changed

Measured: the historical wage test supplies positive floors for all 56 places in every year from 2021 through 2025. The reader in [`historical-world-inputs.ts:63`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/simulation/historical-world-inputs.ts#L63) gives existing dated observations priority. It marks missing historical observations as estimates derived from recorded rates and price drift.

Measured: the electoral tests cover the previous House allocation and the 2020 presidential allocation. The dated seat reader in [`congress-seats.ts:113`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/simulation/living-world/congress-seats.ts#L113) retains the previous allocation until the January 2023 term. Political preparation covers retired districts and labels their same-state House means as estimates.

Measured: the existing institution pipeline opens a historical world. The optional supplied-game argument in [`opening-life.ts:156`](https://github.com/lamontaes/Political-Game-Git/blob/16553ecf5/src/presentation/opening-life.ts#L156) retains the supplied world and character. Session 7 owns the surrounding loading orchestration and has an equivalent institution adapter.

The lighter historical mode uses the same Observer clock and financial writers. Distant office pay now becomes monthly statements. The player, recorded contacts and people living or working in touched towns retain ordinary payroll. Measured: the payroll regression preserves original weekly gross amounts, canonical residence and commuter exemptions, and repeated-settlement behavior. The writer sums each job's own dated terms; it does not use a town average. See the [monthly producer receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006680145).

Measured: repeated distant historical tax observations account for most financial records in the current run. The published tax repair retains the first actual unknown or not-imposed observation per authority, rule and month. It preserves every assessed liability and payment. It does not assign a zero amount to unknown taxes. Ordinary payroll keeps its source assessments. The [tax repair receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6007355291) includes the checked source and its regression results. This repair is included in the completed populated run below. Its individual speed effect was not isolated.

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

## Completed populated result

Measured: Paul Cole's generated world in Wabash County, Illinois opened with 9,421 people and reached January 5, 2026. The existing canonical clock completed every requested annual boundary. The [terminal receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6008360490) records exit code 0. This was a handler and save proof, not a browser journey.

| Period            | Clock seconds | Raw serialized bytes | Measurement seconds |
| ----------------- | ------------: | -------------------: | ------------------: |
| 2021              |       108.399 |          342,088,800 |               6.698 |
| 2022              |       551.367 |          749,113,285 |              16.035 |
| 2023              |       364.256 |          985,634,130 |              21.369 |
| 2024              |     1,237.084 |        1,294,982,929 |              27.682 |
| 2025              |       922.474 |        1,551,054,160 |              33.517 |
| January 1–5, 2026 |        22.791 |        1,569,019,809 |              33.184 |

Measured: clock processing took 3,220.608 seconds, including 2.996 seconds of construction and 11.241 seconds of closing salary settlement and handoff beyond the annual table. Measuring serialized bytes took another 138.484 seconds. The loading receipt measured 3,359.100 wall seconds before final snapshot creation and file writing. The two-minute cap failed. The 2024 clock includes one bounded CPU profile and its overhead; no unprofiled speed ratio is claimed.

Measured: the canonical final save contains 1,640,898,649 bytes. Raw annual byte counts come from streamed serialization; no annual World files were saved. The canonical file includes its stored snapshot form. The [compact evidence packet](../codex/evidence/session5-34-terminal-receipt.json) retains annual counts, growth, heap receipts and the final snapshot identity without copying the giant save.

Measured: final history retains 406,562 flows, 792,494 flow terms, 402,961 transfers and 66,611 tax liabilities. It also retains 28,706 decisions, 1,528 deaths and 1,610 functional-capacity records. The final receipt records 2,862,476,992 bytes of used heap and 3,939,753,984 bytes of resident memory. Record counts alone do not identify which remaining financial rows can safely be summarized.

Measured: the retained 2024 profile contains 31.444406 seconds of sample intervals. Its three largest named inclusive centers are state turnover at 26.069708 seconds (82.9073%), state intake at 25.250514 seconds (80.3021%), and state candidate slates at 21.229199 seconds (67.5134%). Their checked source declarations are state-legislature-turnover.ts lines 1306 and 235, and state-legislature-candidates.ts line 539. These functions are nested; their shares overlap. The denominator is sampled time, not annual or five-year wall time. Nested inclusive time includes 14.508 seconds in household cohorts and 9.692 seconds in selected household members. These times overlap and must not be added. The published household candidate filters unavailable membership candidates and reuses cohorts only within a valid historical sequence interval. Its [checked handoff](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6008289747) records 30 passing controls and configured full typing. This candidate is outside the measured source and remains untimed.

Measured: election lookup controls preserve first matches, equal-sequence status precedence, cancellation, appends, divergent snapshots and reloads. Session 13 corrected eight invalid test ID-kind arguments. The final producer packet uses that actual correction. The existing election suite still has the same 12 failures on candidate and unchanged source. Its failure names and error messages match; no whole-suite pass is claimed.

The final English journal contains five dated education and work entries plus current status. A 2013 work entry precedes a 1979 work entry in that projection. This establishes a journal ordering defect, not absence of all underlying family or work records. No missing chapters or scenes were invented.

## Why time and saved bytes grow

Measured: a read-only scan of the completed canonical save found 486,359,472 bytes in flow terms, 304,452,711 bytes in flows, and 268,692,967 bytes in transfer outcomes. Together those arrays occupy 64.57% of the 1,640,898,649-byte file. Of 406,562 flows, 385,931 are historical monthly office summaries. Their record bodies alone occupy 287,346,347 bytes across 60 recorded dates. They are monthly financial records, not measured daily snapshots.

Measured: the recurring writer creates a summary flow and initial terms, then closing terms and a transfer outcome. The salary writer starts this chain at [`office-salary.ts:407`](https://github.com/lamontaes/Political-Game-Git/blob/34dcc8b6814d64dec99e74362a4429d427b5d097/src/simulation/office-salary.ts#L407). This explains the large monthly financial record families; it does not establish that every financial row is safe to remove.

Measured: January 15, 2024 contains 1,577 dated record bodies occupying 1,972,027 bytes. That includes 652 health-coverage rows occupying 813,298 bytes and 196 decisions occupying 561,215 bytes. January 16 contains 1,003 bodies occupying 1,239,252 bytes, including 215 decisions occupying 600,239 bytes. Candidate recruitment, slates and residence records account for much of the remaining growth. These are stored record dates, not instrumented writer call counts.

Measured by source inspection: [`applyDateBoundary` at time-work.ts:2027](https://github.com/lamontaes/Political-Game-Git/blob/34dcc8b6814d64dec99e74362a4429d427b5d097/src/simulation/time-work.ts#L2027) invokes the lifecycle chain on each new date. State turnover calls nominations before its broad calendar guard and scans seated packs inside an intake window. The retained CPU sample identifies that intake chain as the largest measured time center. Payroll and councils already have dated queue handlers; their existing pattern can replace repeated lifecycle polling.

The [time and byte packet](../codex/evidence/session5-34-time-byte-profile.json) preserves measured array spans, record-kind groups and dated body bytes. It separately lists all 82 terms dates, 64 flow dates and 77 transfer dates, with row counts and body bytes for each date. Existing packed tendencies store 132 rows that expand to 85,716 history rows; those stored counts are intentionally different. Every other included history family's row count matches the final receipt. No World was loaded or advanced by this scan.

Measured: the next largest history arrays are events at 102,164,656 bytes, decisions at 82,869,753 bytes, tax liabilities at 47,687,221 bytes, crisis records at 44,636,402 bytes and due-item states at 20,402,246 bytes. Outside history, people occupy 42,938,714 bytes, place outcomes occupy 39,569,129 bytes and public budgets occupy 31,903,409 bytes. These are measured container spans, not independent costs to add to the full history span.

Measured by source inspection: [`placeOutcomesHandler` at place-outcomes.ts:272](https://github.com/lamontaes/Political-Game-Git/blob/34dcc8b6814d64dec99e74362a4429d427b5d097/src/simulation/outcome-web/place-outcomes.ts#L272) appends a monthly place-outcome record. Public budgets likewise retain monthly fiscal history. Their size is not evidence of daily snapshots. Any retention change must preserve their modeled facts, authority and meaningful consequences.

Measured: the separate canonical Save/Continue check exhausted its 4 GB heap. Its [terminal receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6008495407) records exit code 128 and no proof result. The failing internal phase was not instrumented. Parsing, snapshot verification and ordinary continuation therefore remain unproved at this save size. The heap was not increased and the failed run was not repeated.

## What remains open

The later loading composition reported two new family and robbery-share calibration failures after receiving the household donor. They pass on unchanged main. Session 7 owns the bounded donor correctness repair; Session 5 keeps those household hunks read-only. The producer’s earlier focused pass does not clear these new consumer regressions. See the [consumer regression ruling](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6008532112).

The populated five-year clock and final canonical save are measured. The two-minute cap failed. Save/Continue exhausted its 4 GB heap and exited with code 128; no result was produced. Browser acceptance and research-range checks remain unproved. The loading clip belongs to Session 7. No READY claim is made. The latest owner correction requires profiling and event-driven processing inside the player county as well as distant places. The targets remain under 120 seconds and a canonical save under 50 MB. The earlier coarse-only plan is superseded. The [profile-first receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6008485460) identifies the measured offenders before engine edits.

Historical wage annual alignment and missing law observations remain estimates. They are labeled in developer records. Previous district boundaries are not reconstructed; institutional seat counts are dated, and missing political observations use labeled same-state estimates.

## Method and retained evidence

The original sparse seed was `session5-20261005-historical-world`. The populated seed was `session6-birth-resident-handoff`. Place and age came from the repository's seeded helpers. Diagnostic logs and scripts remain under `test-results/session5` in both worktrees.

Measured: the older retained run on `14747a3a1` completed 2022 in 5,280.747 seconds, with 344,959,627 saved bytes. It was stopped after that annual boundary with exit code 143. Its earlier life packet preserves existing events and family records; no scenes were fabricated. See the [old annual terminal receipt](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6006634467).

Measured: the earlier immutable run on `e52239f01` used the published loading composition and residence protections. It ran with a 4 GiB heap. It completed annual receipts through January 1, 2023, then exited with code 1 during further processing. The constitutional roll call lacked actual presence and quorum. This was an integrity failure, not an out-of-memory exit. Profiles and a read-only query ran on that same process. Some focused validation ran concurrently, so this remains diagnostic handler timing, not a controlled comparison.

Measured: composed source `e52239f01` passed full typing and 29 payroll, character and transport tests before timing. Producer tax repair `61703e95d` passed application typing, lint, formatting and all 9 payroll regressions. Two ordinary statutory-tax fixtures failed identically with the repair and unchanged source. Their shop-pay expectations remain unresolved; no whole-suite PASS is claimed.

The tax repair and streamed reader have an actual Session 7 consumer typing and focused-test receipt. They are included in the completed run; their isolated speed effects remain unmeasured. The benchmark process is terminal; there is no live annual run. A new run will use actual published owner fixes after composition checks. No ordinary-main OOM job has been restarted.

The completed run used immutable source `34dcc8b6814d64dec99e74362a4429d427b5d097`, world `world_c16f6e52af8d3934`, player `person_743951c898f7947d` and snapshot `snapshot_020d90140cb565cd`. Its final moment is January 5, 2026, at minute 420 in America/Chicago. The checked lookup and household candidate head is `de476647ca75d1a53ff23ef73d1e88fa5553b1c0`; it is separate from that timed source. Full configured typing exited 0 and all 30 focused controls passed on the frozen candidate.
