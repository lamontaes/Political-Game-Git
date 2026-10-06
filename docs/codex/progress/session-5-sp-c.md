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
