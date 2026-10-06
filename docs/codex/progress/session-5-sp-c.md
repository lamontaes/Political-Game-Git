# Bounded household reads still miss the performance gate

The cache preserved the captured month but failed the CPU and memory gates. Mean daily CPU rose 6.63%, and maximum sampled heap rose from 1.70 GB to 2.19 GB. Earlier candidates reduced CPU but also exceeded the heap baseline. SP-C remains unapproved, and SP-D remains parked. A bounded allocation diagnosis is the next step before further engine changes.

## Measured result

[The terminal packet](../session5-sp-c/bounded-cache-proof.json) binds the sources, execution handles, executable hashes, all 30 daily rows, every action comparison and all prior timed failures.

| Measure                                             |   Retained baseline |      Latest candidate |
| --------------------------------------------------- | ------------------: | --------------------: |
| Mean daily process CPU, calendar days 2–31          |       5,547.7166 ms |         5,915.3218 ms |
| Mean sampled end-of-day heap                        | 1,174,588,484 bytes |   1,301,053,461 bytes |
| Maximum sampled end-of-day heap                     | 1,704,212,008 bytes |   2,187,667,216 bytes |
| Accepted actions, preserving order/date/cutoff      |                  32 |                    32 |
| Appended full-field record digests                  |           Reference | Equal for all actions |
| Full changed-record/people packets, actions 4 and 5 |           Reference |        Byte-identical |

The sampler records end-of-day observations, not continuous heap peaks. No annual speed, canonical save size, browser or Continue acceptance follows from this month.

## What changed

The person fast lookup aliases the existing append-aware grouping. It adds no second strong history-array retention list. Prior aliases are invalidated when the grouping moves to an appended revision, so an old World rebuilds its own exact view.

Household reads retain at most 16 recently touched person groups in one world and calendar month. Each stores one protected current result and one historical result. World/month changes clear the cache. Raw recorded groups supply the latest available state and location; sorted history copies are not retained. Equal-date/equal-sequence rows preserve the old last-match behavior. Canonical records, IDs, authority, decisions, payments and public date formats remain intact.

These bounds are verified by source and tests. Their presence did not establish a lower measured maximum heap. The precise retention cause remains unproved.

## Checks and disposition

Configured typing exited 0. All 41 focused tests passed, including 32,769 distinct revision reads, month switches, an independent raw-scan oracle, historical dates, exclusive sequences, corrected records, old Worlds in both reading orders and reloads. The original reuse assertions remain.

The one-view intermediate candidate failed a reuse assertion and was never timed. Its failure is retained in the packet. Every completed timing trial is retained separately, including the small-LRU failure. No result is replaced or treated as approval.

SP-C stays draft until CPU decreases, maximum sampled heap is at or below baseline, and captured 32-action parity passes together. Further work profiles allocation retention before changing another cache mechanism. SP-D is preserved locally without a timing claim. No merge or build was performed.

## Exact method

### Bounded allocation evidence

The [allocation packet](../session5-sp-c/allocation-diagnostic.json) records four observations from a separate diagnostic. The [stack attribution](../session5-sp-c/allocation-stacks.json) assigns every sampled self weight once to its nearest source caller, including native Map and array allocations. Its final denominator is 474,874,408 estimated surviving allocation bytes.

At the final observation, history-index allocations account for 67,498,856 bytes, or 14.21% of that denominator. Household-reader allocations account for 405,568 bytes, or 0.09%. The diagnostic's action instrumentation accounts for 21,195,504 bytes, or 4.46%. These are estimated allocation weights, not exact retained heap or a comparison against the baseline.

The largest index stack contributes 8,257,616 sampled bytes through tax entity checks, growing index construction and native Map insertion. Resource-history field grouping contributes additional array allocations. These paths appear in the stack packet. The existing append caches retain recent source arrays, while household projections retain at most 16 touched groups. Source establishes those references; sampling does not establish which reference retains any particular sampled allocation.

Canonical records also grow during this window. The January 18–19 action appends 68,285 statutory tax liabilities totaling 49,242,726 serialized row-body bytes. It also appends 19,428 transfer outcomes totaling 14,191,080 row-body bytes. Those measured rows must not be described as daily snapshots or deleted as a memory fix.

The next bounded hypothesis is that append-index grouping and its recent-array references retain historical groups beyond the current read scope. The [read-only census](../session5-sp-c/cache-census.json) confirms visible older-array references without establishing retained object sizes. At January 12 it counts 47 distinct older source arrays containing 130,796 slots. The stable-key cache alone references 15 older arrays containing 86,545 slots; resource-flow grouping references three containing 38,967 slots. Those per-cache counts overlap.

The census also counts 418,965 index entries and 241,919 grouping slots in visible caches. It does not enumerate weak keys or caches outside the history-index module. Its eight accepted actions preserve the ordinary route, and a focused loader test preserves held groups and current lookup identity. The loader adds a read-only diagnostic closure to compiled code; production source files remain unchanged.

Stack filtering attributes 3,743,664 of the final allocation sample's estimated bytes to history-index work reached through household membership reads. Most index allocation weight comes from other canonical tax, resource and opening readers. Neither this narrower allocation weight nor the early-window census explains the failed month’s baseline-relative heap increase. No further cache iteration or month comparison has started. The precise remaining evidence gap is reference ownership and live-versus-uncollected allocation at the failed month’s later heap maximum; the terminal process cannot supply that retrospectively.

Diagnostic exec 33328, PID 62373, exited 0 with 16 accepted actions through January 20. Its frozen source is `f69228a131af6ea0ce651c82ba132d9aea717ba9`; production files are unchanged from the failed candidate. The [diagnostic driver](../../../scripts/dev-lab/session5-history-lookup/retention-run.mjs) uses the same Ripon input and 4096 MB old-space setting. Inspector allocation sampling uses a 65,536-byte interval and excludes collected objects. Each of four raw profiles stayed below the 8 MiB limit. The packet includes raw hashes and observation timestamps. Sampling changes runtime and collection behavior, so its CPU and heap rows are not acceptance evidence.

The [portable attribution command](../../../scripts/dev-lab/session5-history-lookup/attribute-retention.mjs) takes the four raw profile paths as arguments. Nearest-source buckets are disjoint; inclusive ancestor weights are never added together. Raw profiles remain at `/tmp/session5-retention-f692-Jan20`. No heap snapshot, whole-World save, reload, heap increase or source change occurred during the diagnostic.

Census exec 62210, PID 63826, exited 0 on frozen `2017f179c5ba133b5b6b6a312a538c766bc70f9d`. It stops January 12 with eight accepted actions. Run the [census driver](../../../scripts/dev-lab/session5-history-lookup/cache-census-run.mjs) with the same input environment and `node --max-old-space-size=4096 --import tsx --import ./scripts/dev-lab/session5-history-lookup/register-cache-census.mjs`. Its packet includes exact driver hashes and raw observation hashes. Raw output remains at `/tmp/session5-cache-census-2017-Jan12`. This separate diagnostic is not a speed comparison or memory acceptance proof.

Latest production source: `82444c69de858b80bfe8f529af7f39e9da8ba420`. Baseline: `f88508186b78f526ecf89a420b5fb584171e039a`, retained exec 72328. Candidate exec 18689, PID 61214, exited 0. It started October 6, 2026, at 8:25:19 a.m. Eastern.

Ripon, Wisconsin, place 5568175; world `world_5f9b74dcb02d14ae`, player `person_e54ea866a602ad62`. The [portable input](../../../scripts/dev-lab/session5-history-lookup/ripon-input.json) contains the exact recorded seed and normal age-40 setup.

The [portable runner](../../../scripts/dev-lab/session5-history-lookup/run.mjs) matches the original executable's hashes. Both baseline and latest candidate executed `/tmp/session5-row-proof-runner/run.mjs`. Old-space was configured at 4096 MB; precise coverage was disabled. The metric is outer process CPU, user plus system, including identical sampling and digest accounting. Action 0 is initial Day 1 and excluded. Day 2 includes same-date action 1 and action 2. Actions 1–31 form 30 calendar days through February 5.

Appended digests preserve every payload field and array order. Full packets additionally cover changed people definitions in actions 4 and 5. Earlier prefix revisions and other state dictionaries were not captured. These are captured action-parity results, not full-World byte equality.

Use a fresh output directory and an exclusive process window:

```sh
SESSION5_PROFILE_REPO="$PWD" \
SESSION5_PROFILE_OUTPUT=/tmp/session5-sp-c-new-proof \
SESSION5_PROFILE_INPUT="$PWD/scripts/dev-lab/session5-history-lookup/ripon-input.json" \
SESSION5_PROFILE_SOURCE="$(git rev-parse HEAD)" \
node --max-old-space-size=4096 --import tsx scripts/dev-lab/session5-history-lookup/run.mjs
```

Use the repository storage guard. The retained runs used the already-authorized storage override because free cloud storage was below the local reserve. No whole World was saved or reloaded. Session48's SP-A baseline is a separate comparison; no percentages are combined.
