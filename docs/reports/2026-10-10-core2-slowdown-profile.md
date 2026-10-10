# The new money code checks its own homework nine times per paycheck

On the same Sacramento town, 31 simulated days take about 28 seconds with the old money code and about 87 seconds with the new. Building the town costs 8 seconds in both, so all of the extra time is in the days. Almost all of it, 85%, is spent inside one routine: the one that pays each workday's wages through the cash journal. It runs about 1,000 times a day, and each run now takes about 1.7 milliseconds instead of 0.02. Most of that time is the money code re-reading and re-copying records it has just validated. The repair needs a different shape, not fewer features. Sol's newest branch has the same slowdown.

## What was compared

| Label | Commit | What it is |
|---|---|---|
| BEFORE | `cb6cf69d` | P10 on core base `7e282909` |
| AFTER | `1613fb1a` | the merge of core base `4cce8240` into BEFORE; the merge is the only difference |
| AFTER + P8 | AFTER plus a local, unpushed merge of `pool/P8-part-1` at `32569a5f` | the optional third check |

Place Sacramento, California. Seed `p10-drives-proof-2026-10-09`, start date January 1, 2021, 10,001 people, drives switched off (`--timing-only base`). One process at a time on one 4-core cloud container.

## Timing

Seconds to simulate 31 days, from the script's own printout. Unprofiled.

| Run | BEFORE | AFTER | AFTER + P8 |
|---|---:|---:|---:|
| Warm-up | 29.3 | 91.7 | 96.9 |
| Measured 1 | 26.6 | 84.7 | 89.1 |
| Measured 2 | 28.8 | 88.8 | 81.7 |
| Mean of the two measured | 27.7 | 86.7 | 85.4 |
| Ratio to BEFORE | 1.0 | 3.13 | 3.08 |

| Separate piece | BEFORE | AFTER |
|---|---:|---:|
| Building the town (10,001 people), seconds | 8.2 and 6.3 | 8.0 and 6.8 |
| Simulating the first day only (`--days 1`), seconds | 0.51 | 1.85 |
| Peak memory over the 31 days, MiB (noisy: BEFORE 1,668 to 2,331, AFTER 1,927 to 2,491) | 2,331 | 2,491 |

- The slowdown is per day, not per build. The first day alone is already 3.6 times slower.
- The 92-day run was not needed; 31 days shows the gap.
- Cross-check against OPUS-DRIVES: 59 added seconds over 31,176 paychecks is 1.9 milliseconds each. A full year is about 380,000 paychecks, which predicts roughly 720 added seconds. OPUS-DRIVES measured 636 to 833. The numbers agree.
- Drives are off, so the donation change in the merge (`payDonation`, `src/core2/modules/drives.ts:954`) never ran. It appears in neither profile. It does not matter to this gap. (measured)

## Where the time goes

Profiled run, 31 days, one cpuprofile per version. The profiler adds some overhead: 42.4 s for BEFORE and 103.1 s for AFTER, a gap of 60.6 s. Function lines come from reading the source, because the transpiled profile reports every line as 1.

- 51.3 s of the 60.6 s sits under one function, `settleWorkResultJournal` (`src/core2/work-cash.ts:640`). It did not exist before.
- Garbage collection grew by 9.2 s, 5.4 s to 14.6 s. That is allocation pressure, and the allocation is in the same routine. (inferred)
- Everything else nets to +0.1 s. The ordinary life loop is unchanged: `chooseAct`, `availableActs` and `parameter` cost the same in both.

The old wage settlement (`settleWorkResult`, `src/core2/work-state.ts:236`) cost 0.74 s in BEFORE. The new one costs 51.5 s.

### Hot spots (self time, seconds, profiled)

| Function | BEFORE | AFTER | Added |
|---|---:|---:|---:|
| garbage collector | 5.4 | 14.6 | +9.2 |
| `verify`, `src/core2/finance-plan.ts:309` and `:939` (merged in the profile) | 0 | 13.5 | +13.5 |
| `directRead`, `src/core2/finance-plan.ts:111` | 0 | 7.4 | +7.4 |
| `detach`, `src/core2/finance-plan.ts:393` | 0 | 4.7 | +4.7 |
| `field`, `src/core2/finance-plan.ts:150` | 0 | 3.6 | +3.6 |
| `payload`, `src/core2/finance-plan.ts:268` | 0 | 3.6 | +3.6 |
| `structuredClone` (called at `src/core2/work-cash.ts:611`) | 0 | 2.5 | +2.5 |
| `finish`, `src/core2/finance-plan.ts:614` | 0 | 1.5 | +1.5 |
| `postCashJournal`, `src/core2/journal-state.ts:1133` | 0 | 1.4 | +1.4 |
| `sourceReferences`, `src/core2/work-cash.ts:367` | 0 | 1.3 | +1.3 |
| `chooseAct`, `src/core2/choice.ts:51` | 6.3 | 6.2 | -0.1 |
| `availableActs`, `src/core2/life.ts:146` | 7.1 | 6.1 | -1.0 |

The full top 40 by self time and by total time, with BEFORE beside AFTER, is in the appendix.

### What each paycheck does (counted in a scratch copy, 31 days)

| Count | Value | Per paycheck |
|---|---:|---:|
| Paychecks settled | 31,176 | |
| Read-log replays (`verify`) | 280,626 | 9.0 |
| Recorded reads re-checked | 115.4 million | about 3,700 |
| `detach` calls (deep copy and freeze) | 5.42 million | 174 |
| `payload` walks | 3.10 million | 100 |

The nine replays per paycheck, traced on a 2-day run (measured):

- The main read log holds about 625 recorded reads. It is replayed 5 times: at `finance-plan.ts:895` (cash `finish`), `:616` (metadata `finish`), `:304` (`seal`), and twice more in `FinancePlanPreflight.verify` (`:952`).
- The preflight runs twice because `postCashJournal` calls the work provider for the first lookup (`journal-state.ts:1183`) and the final lookup (`:1425`), and the provider ends with the preflight (`work-cash.ts:531`).
- The second log, of the new payload, holds about 173 reads. It is replayed 4 times (`finance-plan.ts:617`, `:1074`, and the preflight's `:953` twice).
- The first three replays (`:895`, `:616` and `:617`, `:304` and `:1074`) run back to back inside `FinancePlanningSession.seal` (`:1067`). Nothing changes the world between them.

Where the 625 recorded reads come from (measured, per paycheck): `captureWorkContext` (`src/core2/work-cash.ts:177`) records every field of several whole rows. The commitment row at line 195 costs 133 field reads and 32 key reads. The work input at line 200 costs 53, and it includes the day's full scored decision. The age rows at line 220 cost 31. The result payloads add about 150 more, through `finance-plan.ts:1070`, `work-cash.ts:596` and the composer's `#next` (`finance-plan.ts:475`).

## The causes, ranked by share of the 60.6 added seconds

| Rank | Cause | Seconds | Share | Class |
|---|---|---:|---:|---|
| 1 | Replaying the whole read log nine times per paycheck (`verify` and the `directRead` it calls) | 19.2 | 32% | b |
| 2 | Garbage collection from the copies and descriptor objects in causes 1 to 4 | 9.2 | 15% | b (inferred share) |
| 3 | Recording every field of every row the paycheck touches (`payload`, `field`, `mapGet`) | 10.4 | 17% | b |
| 4 | Journal posting and its own checks (`journal-state.ts`, `journal.ts`) | 7.5 | 12% | c |
| 5 | Paycheck plumbing: plan building, source references, act admission, context checks | 6.5 | 11% | c |
| 6 | Deep copy and freeze of the result (`detach`) | 5.0 | 8% | b |
| 7 | Deep clone of the result for the caller (`structuredClone`, `work-cash.ts:611`) | 2.7 | 4% | b |

The seconds for causes 1, 3, 4, 5, 6 and 7 add to the 51.3 s under the routine; with cause 2 and the +0.1 s of everything else they add to 60.6 s.

- Class (a), a scan where an index belongs, was not found. This route has no finance contracts, so there is nothing to scan. No per-day or per-household scan appeared in either profile. (measured)
- Class (b), repeated copying and validation on the hot path, is causes 1, 2, 3, 6 and 7: about 47 seconds, 77% of the gap.
- Class (c), legitimate new work, is causes 4 and 5: about 14 seconds, 23%. The money repair posts a balanced journal entry for every wage, and that has to cost something.

### Proposed fixes, most valuable first

1. **Record only the fields the logic reads, and drop the blanket row walks** (`src/core2/work-cash.ts:195` to `:220`). Replace each `payload(row)` with the specific reads the code uses, or one revision or identity read per row. This cuts the 625 reads per paycheck toward 150, which shrinks causes 1 and 3 together (up to about 22 s) and the garbage collection with them. Confidence: medium. The arithmetic is firm; whether every blanket read guards something real needs Sol's eyes.
2. **Verify once, at the end, instead of three times in a row** (`finance-plan.ts:895`, `:616`, `:617`, `:304`, `:1074`). Keep the preflight's two lookups if they are the safety design, but drop the three back-to-back replays inside `seal`. That removes 2,221 of the 3,817 read checks per paycheck, 58% of cause 1, about 11 s. Confidence: high on the count, medium on safety (no world-changing code runs between them, but Sol owns that contract).
3. **Make one replayed read cheap** (`directRead`, `finance-plan.ts:111`). It builds a property descriptor object on every check (7.4 s plus the garbage it makes). Reject accessors once at record time, then compare the value with `Object.hasOwn` and a plain read. About 5 to 7 s. Confidence: medium.
4. **Stop copying the day's full scored decision into every wage result** (`work-cash.ts:611`, `finance-plan.ts:1069`). The work result carries `decision`, whose `scores` list holds every offer scored that day (`src/core2/types.ts:334`). It is detached, walked, deep-cloned for the caller, and walked again. Store the selected offer, the reason key and the selected reasons; return the already frozen result instead of cloning it. About 8 s plus its garbage. Confidence: medium. I did not check whether any later reader wants `decision.scores` from the stored result.
5. **Leave causes 4 and 5 alone.** They are the money repair doing its job. After fixes 1 to 4 they would be most of what remains.

If fixes 1 and 2 land, a paycheck should fall from about 1.7 ms to roughly 0.5 ms and the 31-day run to about 40 seconds, 1.4 times BEFORE. That is an estimate from the shares above, not a measurement.

## What I did not check

- The BEFORE paycheck count. I assumed the old code settled the same 31,176 paychecks; the ratio of 0.024 ms to 1.65 ms per paycheck rests on that. The unprofiled 3.1 times is measured and does not.
- Whether the changed order of the work and finance modules, or the end-date change in `availableActs` (`life.ts:171`), adds paychecks. The life-loop functions cost the same in both profiles, so the effect is small.
- A 92-day run, and any town other than Sacramento. The routine has no place-specific logic, but I did not run another place.

## Method

- Cloud container only. Worktrees at BEFORE and AFTER; `npm ci` once, shared by both (the lockfile is identical). One process at a time, in this order: warm-up, measured 1, measured 2, each BEFORE then AFTER.
- Command: `node --max-old-space-size=8192 --import tsx src/core2/tooling/drives-proof.ts --timing-only base --days 31`. Build time is the script's stderr line; simulate time is its `seconds` field.
- Profile: the same command with `--cpu-prof`, outputs kept outside the repo. Summaries were made with scripts of my own, which are in this branch under `docs/reports/2026-10-10-core2-slowdown-profile-tools/`. Self time comes from sample deltas; total time counts each function once per sample.
- Counts and read origins came from a scratch worktree with counters added. That copy was reset and never committed. No game code was changed, and `pool/P8-part-1` and `pool/P10-part-1` were not touched.
- The AFTER + P8 check was a local, uncommitted merge in a scratch worktree. The merge was clean; it changed `finance-plan.ts` by four lines.
- Nothing failed. The only hiccup was that the first AFTER checkout was cut off by a command timeout and I redid it.

SONNET-PROFILE

## Appendix: top 40 functions, BEFORE beside AFTER

Seconds in the profiled run. File and line come from the AFTER tree; a few shared functions sit a few lines apart in BEFORE.

**Top 40 by self time in AFTER (BEFORE value alongside)**

| # | Function | BEFORE s | AFTER s | Added s |
|---|---|---:|---:|---:|
| 1 | (garbage collector) :0 | 5.4 | 14.6 | +9.2 |
| 2 | verify `src/core2/finance-plan.ts:309` | 0.0 | 13.5 | +13.5 |
| 3 | directRead `src/core2/finance-plan.ts:111` | 0.0 | 7.4 | +7.4 |
| 4 | chooseAct `src/core2/choice.ts:51` | 6.3 | 6.2 | -0.1 |
| 5 | availableActs `src/core2/life.ts:146` | 7.1 | 6.1 | -1.0 |
| 6 | detach `src/core2/finance-plan.ts:393` | 0.0 | 4.7 | +4.7 |
| 7 | field `src/core2/finance-plan.ts:150` | 0.0 | 3.6 | +3.6 |
| 8 | payload `src/core2/finance-plan.ts:268` | 0.0 | 3.6 | +3.6 |
| 9 | (anonymous) `src/core2/state.ts` | 3.2 | 3.2 | +0.0 |
| 10 | parameter `src/core2/parameters.ts:37` | 3.0 | 3.0 | -0.0 |
| 11 | structuredClone (node:internal/worker/js_transferable) | 0.0 | 2.5 | +2.5 |
| 12 | activate `src/core2/life.ts:211` | 1.5 | 1.7 | +0.2 |
| 13 | finish `src/core2/finance-plan.ts:614` | 0.0 | 1.5 | +1.5 |
| 14 | postCashJournal `src/core2/journal-state.ts:1133` | 0.0 | 1.4 | +1.4 |
| 15 | sourceReferences `src/core2/work-cash.ts:367` | 0.0 | 1.3 | +1.3 |
| 16 | compileSourceTextModule (node:internal/modules/esm/utils) | 1.3 | 1.2 | -0.1 |
| 17 | (anonymous) `src/core2/journal-state.ts` | 0.0 | 0.9 | +0.9 |
| 18 | seal `src/core2/finance-plan.ts:303` | 0.0 | 0.8 | +0.8 |
| 19 | mapGet `src/core2/finance-plan.ts:170` | 0.0 | 0.8 | +0.8 |
| 20 | (anonymous) `src/core2/choice.ts` | 0.3 | 0.7 | +0.4 |
| 21 | (anonymous) `src/core2/modules/life.ts` | 0.5 | 0.6 | +0.1 |
| 22 | dateTime `src/core2/emotion.ts:62` | 0.3 | 0.6 | +0.3 |
| 23 | compareLifePlaceSearchOrder `src/simulation/life-places.ts:726` | 0.6 | 0.6 | -0.0 |
| 24 | checkMetadata `src/core2/journal-state.ts:1056` | 0.0 | 0.6 | +0.6 |
| 25 | settleWorkResultJournal `src/core2/work-cash.ts:640` | 0.0 | 0.5 | +0.5 |
| 26 | knownPublicTargets `src/core2/modules/life.ts:46` | 0.5 | 0.5 | +0.0 |
| 27 | projectCashJournal `src/core2/journal.ts:137` | 0.0 | 0.5 | +0.5 |
| 28 | projectWorkNeeds `src/core2/life.ts:104` | 0.2 | 0.5 | +0.3 |
| 29 | (anonymous) `src/core2/deep-past.ts` | 0.6 | 0.5 | -0.1 |
| 30 | protectJournalObjects `src/core2/journal-state.ts:170` | 0.0 | 0.5 | +0.5 |
| 31 | runScheduledWork `src/core2/modules/work.ts:307` | 0.1 | 0.4 | +0.3 |
| 32 | discretionaryHours `src/core2/modules/work.ts:264` | 0.4 | 0.4 | -0.0 |
| 33 | childhoodFamilyContext `src/simulation/people-upbringing.ts:879` | 0.4 | 0.4 | -0.0 |
| 34 | (idle) :0 | 0.4 | 0.4 | +0.0 |
| 35 | (anonymous) `src/core2/finance-plan.ts` | 0.0 | 0.4 | +0.4 |
| 36 | makeIsoDate `src/simulation/dates.ts:50` | 0.2 | 0.4 | +0.1 |
| 37 | set TextDecoder :0 | 0.2 | 0.4 | +0.2 |
| 38 | validateCommittedAct `src/core2/state.ts:561` | 0.3 | 0.4 | +0.1 |
| 39 | traitScore `src/core2/choice.ts:14` | 0.4 | 0.3 | -0.0 |
| 40 | observe `src/core2/state.ts:660` | 0.5 | 0.3 | -0.1 |

**Top 40 by self time in BEFORE that fall out of AFTER's top 40**

| Function | BEFORE s | AFTER s |
|---|---:|---:|
| refreshNeeds `src/core2/life.ts:71` | 0.4 | 0.3 |
| lineLengths (node:internal/source_map/source_map_cache) | 0.3 | 0.3 |
| (anonymous) `src/simulation/local-institutions.ts` | 0.3 | 0.3 |
| openingTraits `src/core2/population.ts:404` | 0.3 | 0.2 |
| stopgap `src/core2/stopgaps.ts:20` | 0.3 | 0.3 |
| drawFamilyShape `src/simulation/family-shape.ts:26` | 0.2 | 0.2 |
| settleWorkResult `src/core2/work-state.ts:236` | 0.2 | 0.1 |
| (anonymous) `src/core2/population.ts` | 0.2 | 0.2 |
| drawCohortGivenName `src/simulation/given-name-cohorts.ts:84` | 0.1 | 0.1 |
| recordAct `src/core2/state.ts:837` | 0.1 | 0.1 |
| waitForWorker (node:internal/modules/esm/hooks) | 0.1 | 0.1 |
| recordsByStringField `src/simulation/history-index.ts:226` | 0.1 | 0.1 |
| (anonymous) `src/simulation/living-world/town-employment.ts` | 0.1 | 0.1 |
| fork `src/simulation/rng.ts` | 0.1 | 0.1 |
| makeAsyncRequest (node:internal/modules/esm/hooks) | 0.1 | 0.1 |
| (anonymous) `src/districts/place-precinct-population.generated.json` | 0.1 | 0.1 |
| lookupPublicOrganization `src/core2/state.ts:971` | 0.1 | 0.1 |

**Top 40 by total (inclusive) time in AFTER (BEFORE value alongside)**

| # | Function | BEFORE s | AFTER s | Added s |
|---|---|---:|---:|---:|
| 1 | (root) :0 | 42.4 | 103.1 | +60.6 |
| 2 | evaluate :0 | 34.4 | 86.0 | +51.6 |
| 3 | run (node:internal/modules/esm/module_job) | 34.4 | 86.0 | +51.6 |
| 4 | main `src/core2/tooling/drives-proof.ts:268` | 33.7 | 85.4 | +51.7 |
| 5 | (anonymous) `src/core2/tooling/drives-proof.ts` | 33.7 | 85.4 | +51.7 |
| 6 | run `src/core2/tooling/drives-proof.ts:50` | 27.5 | 78.8 | +51.3 |
| 7 | advanceCore `src/core2/life.ts:276` | 27.1 | 78.3 | +51.2 |
| 8 | runScheduledWork `src/core2/modules/work.ts:307` | 1.8 | 54.3 | +52.5 |
| 9 | settleWorkResult `src/core2/state.ts:724` | 0.8 | 51.5 | +50.7 |
| 10 | settleWorkResult `src/core2/work-state.ts:236` | 0.7 | 51.5 | +50.7 |
| 11 | settleWorkResultJournal `src/core2/work-cash.ts:640` | 0.0 | 51.3 | +51.3 |
| 12 | submit `src/core2/work-cash.ts:559` | 0.0 | 36.0 | +36.0 |
| 13 | activate `src/core2/life.ts:211` | 25.1 | 23.6 | -1.5 |
| 14 | verify `src/core2/finance-plan.ts:309` | 0.0 | 19.2 | +19.2 |
| 15 | postJournal `src/core2/state.ts:669` | 0.0 | 16.4 | +16.4 |
| 16 | postCashJournal `src/core2/journal-state.ts:1133` | 0.0 | 16.0 | +16.0 |
| 17 | seal `src/core2/finance-plan.ts:303` | 0.0 | 15.6 | +15.6 |
| 18 | (anonymous) `src/core2/state.ts` | 4.3 | 14.9 | +10.5 |
| 19 | (garbage collector) :0 | 5.4 | 14.6 | +9.2 |
| 20 | availableActs `src/core2/life.ts:146` | 12.2 | 11.0 | -1.2 |
| 21 | workCashSourceProvider `src/core2/work-cash.ts:467` | 0.0 | 10.5 | +10.5 |
| 22 | chooseAct `src/core2/choice.ts:51` | 9.0 | 9.3 | +0.3 |
| 23 | finish `src/core2/finance-plan.ts:614` | 0.0 | 8.4 | +8.4 |
| 24 | directRead `src/core2/finance-plan.ts:111` | 0.0 | 7.4 | +7.4 |
| 25 | payload `src/core2/finance-plan.ts:268` | 0.0 | 6.4 | +6.4 |
| 26 | buildPopulation `src/core2/population.ts:459` | 5.4 | 5.9 | +0.5 |
| 27 | field `src/core2/finance-plan.ts:150` | 0.0 | 5.3 | +5.3 |
| 28 | detach `src/core2/finance-plan.ts:393` | 0.0 | 5.0 | +5.0 |
| 29 | captureWorkContext `src/core2/work-cash.ts:177` | 0.0 | 4.8 | +4.8 |
| 30 | stageWorkConsequences `src/core2/work-cash.ts:230` | 0.0 | 4.0 | +4.0 |
| 31 | mapSet `src/core2/finance-plan.ts:536` | 0.0 | 3.4 | +3.4 |
| 32 | #next `src/core2/finance-plan.ts:475` | 0.0 | 3.3 | +3.3 |
| 33 | (anonymous) `src/core2/population.ts` | 3.1 | 3.0 | -0.0 |
| 34 | parameter `src/core2/parameters.ts:37` | 3.0 | 3.0 | -0.0 |
| 35 | (anonymous) `src/core2/modules/life.ts` | 2.7 | 2.8 | +0.1 |
| 36 | structuredClone (node:internal/worker/js_transferable) | 0.0 | 2.7 | +2.7 |
| 37 | (anonymous) `src/core2/choice.ts` | 2.2 | 2.7 | +0.4 |
| 38 | prepareWorkFinancePlan `src/core2/finance-plan.ts:1647` | 0.0 | 2.5 | +2.5 |
| 39 | (anonymous) `src/core2/life.ts` | 0.8 | 2.2 | +1.4 |
| 40 | admitSelectedCashAct `src/core2/act-cash.ts:47` | 0.0 | 2.1 | +2.1 |

**Top 40 by total time in BEFORE that fall out of AFTER's top 40**

| Function | BEFORE s | AFTER s |
|---|---:|---:|
| openingTraits `src/core2/population.ts:404` | 2.1 | 2.1 |
| afterLoad (node:internal/modules/esm/loader) | 1.9 | 1.6 |
| #translate (node:internal/modules/esm/loader) | 1.9 | 1.6 |
| compileSourceTextModule (node:internal/modules/esm/utils) | 1.8 | 1.6 |
| moduleStrategy (node:internal/modules/esm/translators) | 1.8 | 1.6 |
| upbringingFor `src/simulation/people-upbringing.ts:1103` | 1.8 | 1.8 |
| readUpbringing `src/simulation/people-upbringing.ts:1130` | 1.8 | 1.8 |
| knownPublicTargets `src/core2/modules/life.ts:46` | 1.6 | 1.5 |
| discretionaryHours `src/core2/modules/work.ts:264` | 1.5 | 1.4 |
| childhoodFamilyContext `src/simulation/people-upbringing.ts:879` | 1.5 | 1.5 |
| refreshNeeds `src/core2/life.ts:71` | 1.2 | 1.1 |
| selectedPlace `src/core2/population.ts:174` | 0.9 | 0.9 |
| writeWithWorldIntegrityOnce `src/simulation/world.ts:633` | 0.8 | 0.8 |
| ensureTownEmployment `src/simulation/living-world/town-employment.ts:1230` | 0.8 | 0.8 |
| withWorldIntegrityDeferred `src/simulation/world.ts:600` | 0.8 | 0.8 |
| buildDeepPast `src/core2/deep-past.ts:109` | 0.8 | 0.6 |
| realLocalities `src/core2/places.ts:11` | 0.7 | 0.7 |
| fillTownJobs `src/simulation/living-world/town-employment.ts:1380` | 0.7 | 0.7 |
| (anonymous) `src/core2/places.ts` | 0.7 | 0.7 |
