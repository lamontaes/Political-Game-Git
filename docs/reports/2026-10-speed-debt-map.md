# Read guards and copying still dominate the money system's speed debt

Measured: The repaired money system takes about one and a half times the baseline time on this cloud run. Most positive added time goes into recording reads, checking them again, and copying records. Payday accounting is legitimate new work, but its implementation still repeats those operations. The owner already accepted the earlier, roughly twofold cost as speed debt. This map gives the later speed lane priorities; it does not send the money builder back from the player hooks or reopen that acceptance.

## The measured month

Measured: Both versions advanced Sacramento, California, from January 1 through February 1, 2021, using seed `p10-drives-proof-2026-10-09`. Each world had 10,001 people, 1,781 jobs, zero finance contracts, and 31,176 dated work results. Drives were off and `observer` was false. The [retained receipt](2026-10-speed-debt-map-evidence/receipt.json) records every run.

| Version   | Exact checked head                         | Meaning                                                            |
| --------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Baseline  | `cb6cf69dcd0779d08d6e0ccaca660d6a33b2b2e0` | Earlier P10 no-drives route                                        |
| Candidate | `4127993451c4336a33ebb4413e2c7f263ae6ad1e` | SOL-1258's current `pool/P8-part-1` head when fetched and measured |

Measured seconds include initialization and advancement. Generation, explicit garbage collection between worlds, input hashing, and result capture are outside the window.

| Run                            | Baseline seconds | Candidate seconds |
| ------------------------------ | ---------------: | ----------------: |
| Warmup                         |           16.174 |            47.192 |
| Timed 1                        |           27.000 |            46.958 |
| Timed 2                        |           29.711 |            45.104 |
| Timed 3                        |           32.542 |            44.807 |
| Median of three timed runs     |           29.711 |            45.104 |
| Days per minute at that median |            62.60 |             41.24 |
| Separate profiled world        |           27.064 |            49.213 |

Measured: The median duration ratio is **1.518×**, with **15.393 extra seconds per 31 days**. Baseline timing varied substantially, including a faster warmup; the candidate's timed range was narrower. These three-run samples do not establish a stable cross-host multiplier.

Measured in the earlier receipt: SOL-1258 reported 94.834 versus 45.708 seconds, or 2.075×. The owner accepted that result as speed debt in [the decision on #3918](https://github.com/lamontaes/Political-Game-Git/pull/3918#issuecomment-6103614128). The fresh result is a separate observation, not a replacement for that decision.

Measured: The fresh candidate and baseline input hashes exactly match their respective inputs in that earlier receipt. The two versions' input bytes differ from each other. This is the same recorded generation route and roster, not an identical-input comparison across versions.

## Where the positive added time goes

Measured: After excluding profiler-control stacks, the profiles contain 49.214 candidate seconds and 27.064 baseline seconds. Their difference is **22.150 sampled seconds**. Every retained sample enters exactly one bucket; nested function totals are not added together. The [analyzer](2026-10-speed-debt-map-evidence/analyze.mjs) defines the assignments.

Measured: Positive bucket differences total **30.142 seconds**. Other simulation and runtime work offsets them by **7.992 seconds**. The first share column ranks the positive costs and sums to 100%; the second uses the net 22.150-second gap and therefore sums above 100% before the offset.

Classification and proposed fixes below are **inferred from source**, not measured savings. **B** means repeated recording, copying, freezing, or validation. **C** means legitimate new money work, whose implementation can still become cheaper. **D** means shared work or an unattributed change. No whole-world or whole-history scan was identified as a leading cost on this route.

All source locations below refer to the candidate head, except the explicitly named baseline settlement.

| Rank | Cause and source location                                                                                                                                                                                                                                                                                  | Added sampled seconds | Share of positive costs | Share of net gap | Class and proposed shape fix                                                                                                                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------: | ----------------------: | ---------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Read recording: [`finance-plan.ts:171`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/finance-plan.ts#L171) records descriptors; `:287` walks payload graphs.                                                                                    |                 9.777 |                   32.4% |            44.1% | **B.** Use compact, typed read sets for changed fields and core-owned immutable evidence handles. Keep mutable field, descriptor, owner, and Source checks at the actual commit boundary.                                         |
| 2    | Read-log validation: [`finance-plan.ts:328`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/finance-plan.ts#L328) replays captured reads.                                                                                                         |                 5.999 |                   19.9% |            27.1% | **B.** Separate admission from final drift checks. Pass one sealed, revision-bound plan through journal preparation; validate at each genuine callback or mutation boundary rather than replaying unchanged graphs between them.  |
| 3    | Copying and freezing: [`work-attendance.ts:192`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/work-attendance.ts#L192) copies shallow rows; `:221` detaches results. Other contributors are `work-pay-period.ts:241` and `finance-plan.ts:419`. |                 4.836 |                   16.0% |            21.8% | **B.** Stage small actor patches and scalar ledger rows against an owned preimage. Reuse admitted immutable evidence and the frozen result; avoid constructing another full validator or result copy inside the same transaction. |
| 4    | Pay-period calculations and guards: [`work-pay-period.ts:787`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/work-pay-period.ts#L787) resolves accrual; `:868` requests pay and `:931` settles it.                                               |                 3.323 |                   11.0% |            15.0% | **C.** Resolve one period per admitted calendar, date, and parameter revision. Pass that core-owned period through accrual or settlement, preserving chronology, original-period ownership, rounding, and arrears checks.         |
| 5    | Garbage collection: allocation sites include [`finance-plan.ts:171`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/finance-plan.ts#L171), `work-attendance.ts:192`, and `:221`.                                                                  |                 2.285 |                    7.6% |            10.3% | **D; allocation cause inferred.** Reduce the temporary graphs in ranks 1–3. The profile measures collection time, not which allocation caused it; do not assign all of this saving to one routine.                                |
| 6    | Payroll settlement and dispatch remainder: [`work-payroll-cash.ts:2209`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/work-payroll-cash.ts#L2209) prepares settlement; `work-payroll-dispatch.ts:293` prepares dispatch.                        |                 1.466 |                    4.9% |             6.6% | **C.** Carry one owned worker/employer/period context from dispatch through settlement and source resolution. Invalidate it if a callback changes its witnesses; preserve grouped jobs and ended-job debt.                        |
| 7    | Attendance and accrual remainder: [`work-attendance.ts:510`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/work-attendance.ts#L510) records attendance and earned pay. The bucket subtracts baseline `work-state.ts:158` settlement.             |                 1.095 |                    3.6% |             4.9% | **C, mixed with existing attendance work.** Keep one small staged update for attendance, earned-period totals, and indexes. Feed the existing validator a typed view without rebuilding temporary maps for each occurrence.       |
| 8    | Finance planning and authority remainder: [`finance-plan.ts:1702`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/finance-plan.ts#L1702) prepares conserving payment and funding terms.                                                           |                 0.543 |                    1.8% |             2.4% | **C.** Reuse captured account and owner identities within the owned plan. Keep finite credit, public-payment authority, and cash-conservation checks before posting.                                                              |
| 9    | Journal posting and checks remainder: [`journal-state.ts:1133`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/journal-state.ts#L1133) posts cash and staged metadata.                                                                            |                 0.423 |                    1.4% |             1.9% | **C.** Use compact typed postings and metadata patches under one atomic commit. Preserve account ownership, balance, sequence, and final source-drift rejection.                                                                  |
| 10   | Work scheduling remainder: [`modules/work.ts:302`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/modules/work.ts#L302) schedules the dated work occurrence.                                                                                      |                 0.396 |                    1.3% |             1.8% | **D.** Consider reusing dated planned minutes within one occurrence, invalidating on changed commitments or occupied time. This small difference needs confirmation before changing the shared scheduler.                         |

Measured: The other simulation/runtime bucket fell from 23.503 to 15.511 seconds, a **−7.992-second offset**, or **−36.1% of the net gap**. For example, inclusive `availableActs` fell from 11.683 to 7.594 seconds, and `chooseAct` from 8.258 to 5.628 seconds. These functions overlap, so those values are witnesses, not additional buckets. No shape fix is justified for this negative residual from one profile pair.

Inferred: Host variation and changed execution paths may contribute to the shared-work differences. This measurement did not distinguish them. The ranked shares describe this profile pair; they are not exact shares of the unprofiled 15.393-second median gap.

## Which new work earns its cost

Inferred: Recording earned pay separately from cash, recognizing an actual due period, retaining arrears, and posting a conserving journal are legitimate parts of the approved payday contract. Ranks 4 and 6–9 contain those operations after their read machinery and copying have been separated out. Their positive differences total **6.850 sampled seconds**, or **22.7% of positive costs**. That is a lower bound on necessary work, not a minimum attainable runtime: necessary ownership and tamper checks also occur inside ranks 1–3.

Measured: Ranks 1–3 account for **20.612 seconds**, or **68.4% of positive costs**. Inferred: The repeated representation and checking of facts is the first optimization target; deleting money guards is not the proposed fix.

Measured: The two main candidate branches are substantial: attendance recording takes 14.384 inclusive seconds; payday settlement takes 12.303 inclusive seconds. Inside attendance, read recording, validation, and copying account for about 10.991 seconds. Inside payday settlement, they account for about 8.544 seconds. Garbage collection is sampled separately and cannot be attributed to either branch.

Inferred: The repeated-payday-context opportunity spans source resolution. [`work-payroll-cash.ts:2132`](https://github.com/lamontaes/Political-Game-Git/blob/4127993451c4336a33ebb4413e2c7f263ae6ad1e/src/core2/work-payroll-cash.ts#L2132) verifies its rebuilt provider reads and the pending plan. The journal invokes the provider at `journal-state.ts:1183` and `:1425`.

Measured: The provider's inclusive cost is 8.057 seconds in the [retained analysis](2026-10-speed-debt-map-evidence/receipt.json). It is already distributed among the ranked buckets.

Measured: Each candidate world retains 4,138 payroll cash-source rows and 1,781 payroll ledgers, while both versions record 31,176 work results. Those source rows are not a count of cash journal entries or distinct paid workers. No function-call instrumentation or extra world run was used to infer such counts.

## What happens next

Proposed: The speed lane should start with compact attendance read sets and staged actor patches, then the shared payroll preparation/source context. Keep final mutation checks and the existing Source-tampering, grouped-job, partial-pay, retry, ended-job-debt, and conservation cases. Measure each change against the accepted money base in an exclusive run window.

Measured: This assignment changed no game code and pushed nothing to `pool/P8-part-1`. The report, compressed profiles, receipt, and measurement tools are on `pool/speed-map` for a draft PR. SOL-1258 receives a short map comment on #3918; player hooks and the judged money year remain in that lane.

Unmeasured: No annual speed, annual financial outcome, active customer-contract path, different town, or player-facing route was tested. No saving estimate is claimed for any proposed fix. A single CPU profile per head gives priorities, not a precise causal allocation or an annual acceptance grade.

## Method and resources

Measured on October 11, 2026: One cloud container, Linux x64, Node v24.19.0, Intel Xeon Platinum 8573C, five visible logical CPUs, and a four-CPU cgroup quota. Candidate ran first, then baseline; their processes never overlapped. One immutable generated input per head supplied one warmup, three timed fresh worlds, and one additional profiled fresh world in that same process.

The [collector](2026-10-speed-debt-map-evidence/collect.mjs) uses the earlier proof's `enrichCivicInputs(buildDeepPast(buildPopulation(...)))` route, 10,000 minimum people, and `createLifeCore(input, {observer:false})`. It calls `advanceCore` once through February 1. Both heads use the same lockfile and dependency install. The checkout was reused sequentially; no comparison copy or game instrumentation was created.

Command, run separately at each exact detached head under the storage guard:

```sh
OCD_STORAGE_STATE_DIR=/workspace/speed-map-storage OCD_WORKSPACE_OWNER=SPEED-MAP \
  npm run storage -- run test -- node --max-old-space-size=8192 --expose-gc \
  --import tsx /workspace/speed-map-evidence/collect.mjs \
  /workspace/Political-Game-Git <baseline-or-candidate> <exact-head> \
  /workspace/speed-map-evidence
```

Measured: Inspector sampling used a 1,000-microsecond interval around only the fifth world's initialization and advancement. Starting/stopping the profiler is outside the timer. The analyzer excludes sampled `node:inspector` control stacks: 0.962 baseline seconds and 1.200 candidate seconds. Retained sampled totals match timed profile windows within one millisecond. It uses `timeDeltas[i]`, counts recursion once for inclusive functions, and gives every retained sample one bucket.

The [baseline CPU profile](2026-10-speed-debt-map-evidence/baseline.cpuprofile.gz) and [candidate CPU profile](2026-10-speed-debt-map-evidence/candidate.cpuprofile.gz) are losslessly compressed. Decompress them before opening in a CPU-profile viewer. The receipt records their original SHA-256 hashes and the full analysis. Profile source lines were flattened by transpilation; file:line anchors above come from reading the pinned source.

Measured: Candidate collection after generation ran from 12:21:10 a.m. to 12:25:09 a.m. UTC; baseline collection ran from 12:25:29 a.m. to 12:27:49 a.m. UTC. Together those windows took 378.372 seconds; generation and module imports were additional. Environment startup and the first default-sandbox network/preflight attempts delayed setup; the configured proxy and storage guard worked with network access enabled.

SPEED-MAP used GPT-6 (Codex). The runtime did not expose the reasoning-effort setting or token usage, so neither is claimed as measured. No model or effort escalation was requested. The receipt records the first observed session clock, collection windows, and publication-preparation clock; report review is recorded separately.
