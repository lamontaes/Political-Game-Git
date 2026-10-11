# A town year needs far more than a smaller read guard

Measured: Three town years took 644.7 to 816.4 seconds, against a 120-second target. Attendance, payroll, and garbage collection dominate. Read recording, validation, and copying account for about 48% of sampled time. Their complete removal would still leave every measured year over budget.

Proposed: Following the earlier debt map, prototype shared transaction context and reduced allocation first, then measure another full year.

## Three completed years

Measured: Each existing unattended clock advanced from January 1, 2021, to January 1, 2022: 365 days. These are full-year results, rather than a month multiplied by twelve. Initialization and advancement are timed; generation and profile serialization are outside that window.

| Place                    | Generation seed                          | Year seconds | Advancement seconds | Times the two-minute target | Seconds to remove | Required reduction | Peak RSS MiB |
| ------------------------ | ---------------------------------------- | -----------: | ------------------: | --------------------------: | ----------------: | -----------------: | -----------: |
| Mount Charleston, Nevada | `speed-plan-all56-2026-10-11-v1:world:0` |       816.40 |              815.73 |                       6.80× |            696.40 |              85.3% |       6288.8 |
| Lake Montezuma, Arizona  | `speed-plan-all56-2026-10-11-v1:world:1` |       707.64 |              707.13 |                       5.90× |            587.64 |              83.0% |       5924.3 |
| Port LaBelle, Florida    | `speed-plan-all56-2026-10-11-v1:world:2` |       644.71 |              644.23 |                       5.37× |            524.71 |              81.4% |       5945.5 |

Measured: Each year is one fresh, profiled process. There are no warmups or repeated annual medians. Sampling overhead is unmeasured, so these durations are profiled observations. Peak RSS includes imports, generation, input census, initialization, advancement, and profile capture.

## Module time

Measured: Each retained sample belongs to exactly one row below. Garbage collection is separate because its samples do not identify the allocating module. These are weighted sampled seconds, not summed CPU time across processor threads.

| Module or clock step                   | Mount Charleston, Nevada | Lake Montezuma, Arizona | Port LaBelle, Florida |
| -------------------------------------- | -----------------------: | ----------------------: | --------------------: |
| Work / scheduled attendance            |                   327.39 |                  282.96 |                269.36 |
| Work / payroll dispatch and settlement |                   257.70 |                  241.65 |                197.69 |
| Runtime / garbage collection           |                   165.43 |                  130.82 |                118.24 |
| Life / discretionary activation        |                    60.39 |                   46.74 |                 54.68 |
| Other simulation and runtime           |                     3.50 |                    3.38 |                  2.86 |
| Clock / due actors                     |                     1.45 |                    1.65 |                  1.42 |
| Opening / initialization               |                     0.43 |                    0.36 |                  0.38 |
| Retention / compaction                 |                     0.10 |                    0.08 |                  0.07 |

## Step time

Measured: This is a second partition of the same samples, not additional time. The deepest matching read, validation, copying, or collection frame takes priority. The nearest remaining operation supplies the broader step. The retained analyzer defines the assignments.

| Step                           | Mount Charleston, Nevada | Lake Montezuma, Arizona | Port LaBelle, Florida |
| ------------------------------ | -----------------------: | ----------------------: | --------------------: |
| Read recording                 |                   168.85 |                  146.89 |                135.16 |
| Garbage collection             |                   165.43 |                  130.82 |                118.24 |
| Read-log validation            |                   116.35 |                  106.02 |                 89.33 |
| Copying and freezing           |                   105.87 |                   88.11 |                 85.70 |
| Pay-period calculations        |                    84.54 |                   83.10 |                 67.94 |
| Attendance remainder           |                    46.24 |                   41.05 |                 37.02 |
| Other simulation and runtime   |                    40.10 |                   32.69 |                 36.23 |
| Payroll remainder              |                    25.27 |                   23.83 |                 18.44 |
| Offer enumeration              |                    22.73 |                   18.70 |                 19.54 |
| Need refresh                   |                    14.77 |                   13.25 |                 14.59 |
| Choice scoring                 |                    14.01 |                   10.54 |                 12.19 |
| Finance planning and authority |                     8.07 |                    7.61 |                  6.12 |
| Journal posting and checks     |                     4.17 |                    5.04 |                  4.22 |

Measured: Read recording, read-log validation, and copying together consume 391.1 seconds (47.9%) in Mount Charleston, Nevada, 341.0 seconds (48.2%) in Lake Montezuma, Arizona, 310.2 seconds (48.1%) in Port LaBelle, Florida.

Inferred: This supports the priorities in the [earlier speed debt map](2026-10-speed-debt-map.md). That map compared two sources over one month in another town. These annual samples use a later source and different worlds; the difference between those reports is not a measured regression or a causal improvement.

## Monthly time and memory

Measured: The checkpoint columns below are advancement seconds / end-of-interval RSS MiB. The peak RSS figures above use the operating system high-water mark, which can exceed any checkpoint. Memory growth here does not establish a leak or identify an allocation source.

| Through date | Mount Charleston, Nevada | Lake Montezuma, Arizona | Port LaBelle, Florida |
| ------------ | -----------------------: | ----------------------: | --------------------: |
| 2021-02-01   |             53.06 / 4551 |            47.05 / 3893 |          43.28 / 4284 |
| 2021-03-01   |             61.17 / 5233 |            52.83 / 4967 |          48.95 / 5107 |
| 2021-04-01   |             65.86 / 5351 |            57.92 / 5211 |          53.05 / 5253 |
| 2021-05-01   |             65.62 / 5427 |            58.12 / 5284 |          55.19 / 5265 |
| 2021-06-01   |             69.96 / 5567 |            59.44 / 5355 |          54.09 / 5404 |
| 2021-07-01   |             65.45 / 5683 |            57.35 / 5430 |          52.39 / 5501 |
| 2021-08-01   |             69.54 / 5757 |            62.88 / 5542 |          54.46 / 5561 |
| 2021-09-01   |             74.02 / 5904 |            58.57 / 5588 |          58.29 / 5622 |
| 2021-10-01   |             69.47 / 5989 |            65.74 / 5642 |          54.79 / 5718 |
| 2021-11-01   |             76.39 / 6086 |            60.04 / 5743 |          56.77 / 5757 |
| 2021-12-01   |             70.49 / 6191 |            60.66 / 5793 |          56.22 / 5872 |
| 2022-01-01   |             74.70 / 6284 |            66.52 / 5920 |          56.76 / 5919 |

## Ranked options and their limits

Estimated: No implementation was changed, so no saving below has been measured. The ranges apply explicit planning reductions to measured, exclusive buckets. They are sensitivity assumptions, not confidence intervals or validated forecasts. Ranking uses the median upper saving across the three towns; the table retains each town’s range.

| Rank | Option                                                              | Measured buckets used for estimate                          | Assumed reduction of its buckets | Mount Charleston, Nevada | Lake Montezuma, Arizona | Port LaBelle, Florida |
| ---: | ------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------: | -----------------------: | ----------------------: | --------------------: |
|    1 | Compact admitted read sets and shared immutable evidence            | Read recording + Read-log validation + Copying and freezing |                           50–80% |            195.5–312.9 s |           170.5–272.8 s |         155.1–248.1 s |
|    2 | Reduce temporary allocation and repeated deep copies                | Garbage collection                                          |                           40–70% |             66.2–115.8 s |             52.3–91.6 s |           47.3–82.8 s |
|    3 | Resolve and reuse one payroll-period context                        | Pay-period calculations + Payroll remainder                 |                           30–60% |              32.9–65.9 s |             32.1–64.2 s |           25.9–51.8 s |
|    4 | Use one attendance patch and validator view per occurrence          | Attendance remainder                                        |                           30–60% |              13.9–27.7 s |             12.3–24.6 s |           11.1–22.2 s |
|    5 | Reuse offers and scores only while their witnesses remain unchanged | Offer enumeration + Choice scoring                          |                           30–60% |              11.0–22.0 s |              8.8–17.5 s |            9.5–19.0 s |
|    6 | Carry compact postings and authority through one commit             | Finance planning and authority + Journal posting and checks |                           20–40% |                2.4–4.9 s |               2.5–5.1 s |             2.1–4.1 s |

Inferred: GC benefits overlap allocation and representation changes. Function witnesses such as payroll Source completion also overlap the read, period, and copying buckets. Do not add their inclusive costs, or add the GC estimate to another estimate as though its cause were independent.

Proposed 1: **Compact admitted read sets and shared immutable evidence.** [finance-plan.ts:171](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/finance-plan.ts#L171) records reads; [finance-plan.ts:328](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/finance-plan.ts#L328) replays them. Replace repeated payload traversal and detached validator views with typed fields and owner-admitted immutable handles. Keep descriptor, owner, Source, drift, and callback-boundary checks.

Proposed 2: **Reduce temporary allocation and repeated deep copies.** [work-attendance.ts:254](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/work-attendance.ts#L254) detaches evidence. Reuse sealed results and small staged patches. GC saving overlaps the first option; the profile does not identify which allocations caused collection.

Proposed 3: **Resolve and reuse one payroll-period context.** [work-pay-period.ts:789](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/work-pay-period.ts#L789) resolves accrual; [work-payroll-cash.ts:1912](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/work-payroll-cash.ts#L1912) rebuilds payroll Sources. Reuse revision-bound employer, worker, period, and source context through settlement, retaining rounding, arrears, ended-job debt, and changed-witness rejection.

Proposed 4: **Use one attendance patch and validator view per occurrence.** [work-attendance.ts:547](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/work-attendance.ts#L547) records attendance. Batch typed changes under the existing atomic writer and reuse the admitted preimage. This estimate excludes reads, copying, and period calculations already counted above.

Proposed 5: **Reuse offers and scores only while their witnesses remain unchanged.** [life.ts:197](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/life.ts#L197) enumerates offers; [choice.ts:75](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/choice.ts#L75) scores them. Cache static affordance candidates and immutable trait inputs by revision. Invalidate on changed needs, relationships, law, occupied time, and offers; never reuse a stale decision.

Proposed 6: **Carry compact postings and authority through one commit.** [journal-state.ts:1634](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/journal-state.ts#L1634) completes a Source. Carry typed postings and resolved ownership instead of repeating preparation. Preserve finite funding, public authority, conservation, sequence, and final Source checks.

Measured: The actor-due scan is small in these profiles. Removing all of its sampled time would save 1.45 seconds, 1.65 seconds, 1.42 seconds. It is not the leading annual speed target.

## What would have to close the gap

Estimated upper bound: Even deleting whole categories of necessary work leaves the following times. These are impossible-removal ceilings on savings, not proposed changes. They show why smaller read guards alone cannot meet the target.

| Hypothetical remaining seconds                     | Mount Charleston, Nevada | Lake Montezuma, Arizona | Port LaBelle, Florida |
| -------------------------------------------------- | -----------------------: | ----------------------: | --------------------: |
| Delete all read recording, validation, and copying |                    425.3 |                   366.6 |                 334.5 |
| Also delete all garbage collection                 |                    259.9 |                   235.8 |                 216.3 |
| Also delete all period calculations                |                    175.4 |                   152.7 |                 148.4 |

Conditional planning scenario: A portfolio that removes 90% of read/validation/copy time, 80% of GC time, and 85% of all remaining time would leave 111.2 seconds in Mount Charleston, Nevada, 95.6 seconds in Lake Montezuma, Arizona, 87.1 seconds in Port LaBelle, Florida. This is a closure budget, not evidence that these reductions are achievable. It assumes additive elapsed savings and unchanged outcomes; profiler overhead remains embedded.

Proposed: Prototype shared owner-admitted immutable evidence and compact typed transaction patches first. Then reuse one revision-bound period and payroll Source context across attendance and settlement. Measure each against this pinned source before extending it to a batch under the same writer. Keep final mutation checks and callback invalidation.

Proposed: Repeat the full year after each substantial improvement. Preserve the Source-tampering, grouped-job, partial-payment, retry, ended-job-debt, chronology, rounding, and conservation cases. A matched M0 month comparison must enforce the existing 1.20 ratio; a month improvement alone cannot establish the annual target.

Unmeasured: No current option is proved to close the gap. The conditional portfolio needs prototypes to establish both savings and financial equivalence. Keep political playability and the money-year acceptance decision with their existing owners.

## Method, guard, and resources

Measured: The fetched core head is `b2d5bd34ab8e42afa2000db5676a7f7048d6df29`. The collection checkout is `379971ea6cc22ffa044a475f89da15aec4178635`; its additional commit contains documentation and tools only. All three receipts record the same source tree, `da463e9b63987084ce946f8bd2db2ec415698d24`. The collector rejects modified game source.

Measured: M0 guard files are retained byte-for-byte from `31cc98bb0b2c4d72cd1ef7243919232217ecb713`, under the evidence `guard/` directory. The collector calls its `prepareWorld` and the core’s unchanged opening-input budget checker. Annual advancement extends the guard’s month horizon without changing game code or guard policy.

| Place                    | Residents | Opening MiB | Bytes per resident | Conservative Source share | Existing opening guard |
| ------------------------ | --------: | ----------: | -----------------: | ------------------------: | ---------------------- |
| Mount Charleston, Nevada |    10,001 |      236.12 |              24756 |                    61.96% | PASS                   |
| Lake Montezuma, Arizona  |    10,002 |      227.74 |              23875 |                    59.90% | PASS                   |
| Port LaBelle, Florida    |    10,002 |      222.65 |              23342 |                    62.16% | PASS                   |

Measured: The unchanged limits are 80,554 bytes per resident and 74.9142% conservative Source share. No before/after source pair was measured, so this report does not claim a relative speed-guard pass. The guard’s paired warmup/three-run protocol and deadline were not used as an annual acceptance test.

Measured: The draw seed is `speed-plan-all56-2026-10-11-v1`. SHA-256 derives indexes into a sorted pool of all 56 jurisdictions without replacement, then a sorted, unfiltered locality pool. No redraw, population filter, smaller benchmark town, or behavior randomization was used. The generator retains the existing 10,000 minimum residents.

Measured: The route is the guard’s population, deep-past, civic-input, opening-peer, and actual focus-circle preparation, followed by `createLifeCore(input, {observer:false, scheduledWork:true})`. It advances the ordinary unattended clock in twelve calendar-month intervals. No synthetic speed module, active finance contract, or explicit player controller was installed.

Inferred from source: Work and life are the installed modules on this route. The population builder supplies employer capital and pay calendars, but no `input.finance` contract book. Customer-contract settlement, national political behavior, interactive choices, and realistic annual financial outcomes are outside this measurement. See [population.ts:1022](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/population.ts#L1022) and [life.ts:95](https://github.com/lamontaes/Political-Game-Git/blob/b2d5bd34ab8e42afa2000db5676a7f7048d6df29/src/core2/life.ts#L95).

Measured: Inspector samples at 10,000 microseconds around initialization and advancement. Generation, imports, census, and input hashing precede the timer. Tiny monthly checkpoint writes remain inside total elapsed time but outside advancement time. Serialization and gzip follow the timer. Sampled inspector-control stacks are excluded from the primary analysis.

Measured: The primary analyzer uses `timeDeltas[i]` and counts recursion once for inclusive witnesses. The October 10 summarizer, bucket, and tree tools are retained and used as cross-checks through M0’s profile-summary adapter. Their older next-sample delta convention can give slightly different totals; the primary partitions above use the current-sample delta consistently.

Measured: The host is `bbe4eeeb0236`, Linux x64, v24.19.0, AMD EPYC 9V74 80-Core Processor, with 5 visible CPUs, a four-CPU cgroup quota, and 16 GiB cgroup memory. The reused checkout and dependency install served all three processes sequentially. No world processes, tests, or builds overlapped.

Reproduce the retained draw and run each index sequentially under the storage guard:

```sh
node --import tsx docs/reports/2026-10-core2-year-speed-plan-evidence/collect.mjs --draw
for run_index in 0 1 2; do
  OCD_STORAGE_STATE_DIR=/workspace/.ocd-dev npm run storage -- run test -- \
    node --max-old-space-size=8192 --import tsx \
    docs/reports/2026-10-core2-year-speed-plan-evidence/collect.mjs "$run_index"
done
node docs/reports/2026-10-core2-year-speed-plan-evidence/analyze.mjs
```

Measured time: The three profiled year windows totaled 2168.76 seconds (36.15 minutes). The retained setup-to-handoff preparation window was 42.95 minutes, including collection, analysis, checks, and report review. Earlier environment setup is outside that observed window.

Measured resources: GPT-6 (Codex). The runtime did not expose effort or token usage; no escalation was requested. The first retained setup clock is October 11, 2026, at 04:57:53 UTC. Exact collection windows and total observed elapsed time are recorded in the session receipt. Report review and validation are recorded separately.

Retained evidence:

- Mount Charleston, Nevada: [year receipt](2026-10-core2-year-speed-plan-evidence/0-receipt.json), [CPU profile](2026-10-core2-year-speed-plan-evidence/0.cpuprofile.gz), [exclusive analysis](2026-10-core2-year-speed-plan-evidence/0-analysis.json).
- Lake Montezuma, Arizona: [year receipt](2026-10-core2-year-speed-plan-evidence/1-receipt.json), [CPU profile](2026-10-core2-year-speed-plan-evidence/1.cpuprofile.gz), [exclusive analysis](2026-10-core2-year-speed-plan-evidence/1-analysis.json).
- Port LaBelle, Florida: [year receipt](2026-10-core2-year-speed-plan-evidence/2-receipt.json), [CPU profile](2026-10-core2-year-speed-plan-evidence/2.cpuprofile.gz), [exclusive analysis](2026-10-core2-year-speed-plan-evidence/2-analysis.json).
- [Draw](2026-10-core2-year-speed-plan-evidence/draw.json), [collector](2026-10-core2-year-speed-plan-evidence/collect.mjs), [analyzer](2026-10-core2-year-speed-plan-evidence/analyze.mjs), and [session receipt](2026-10-core2-year-speed-plan-evidence/session.json).

Measured validation and independent review: recorded in the session receipt and draft PR. Source changes: none. GitHub Project task claiming was denied by the integration; measurement and the single draft PR continued within the authorized scope.
