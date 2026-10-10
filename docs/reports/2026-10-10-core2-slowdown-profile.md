# The new wage code makes a game year about three times slower

A game year now takes roughly 1,000 seconds instead of 324, from the full-year timing done earlier today. One routine causes nearly all of it: the one that pays wages through the cash journal. On the same Sacramento town, 31 simulated days take about 28 seconds with the old money code and 87 with the new, and building the town takes the same time in both. The routine mostly re-reads and re-copies records it has just checked. Owner decision: the 20% speed budget (no year more than 1.2 times main) probably cannot be met even after those fixes, so decide whether it applies to the new money code.

## What was compared

| Label      | Commit                                                               | What it is                                                                      |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| BEFORE     | `cb6cf69d`                                                           | P10 on core base `7e282909`                                                     |
| AFTER      | `1613fb1a`                                                           | the merge of core base `4cce8240` into BEFORE; the merge is the only difference |
| AFTER + P8 | AFTER plus a local, unpushed merge of `pool/P8-part-1` at `32569a5f` | the optional third check                                                        |

Place Sacramento, California. Seed `p10-drives-proof-2026-10-09`, start date January 1, 2021, 10,001 people, drives switched off (`--timing-only base`). One process at a time on one 4-core cloud container. Everything below is measured unless it says inferred.

## Timing

Seconds to simulate 31 days, from the script's own printout. Unprofiled.

| Run                      | BEFORE | AFTER | AFTER + P8 |
| ------------------------ | -----: | ----: | ---------: |
| Warm-up                  |   29.3 |  91.7 |       96.9 |
| Measured 1               |   26.6 |  84.7 |       89.1 |
| Measured 2               |   28.8 |  88.8 |       81.7 |
| Mean of the two measured |   27.7 |  86.7 |       85.4 |
| Ratio to BEFORE          |    1.0 |  3.13 |       3.08 |

AFTER + P8 is AFTER with Sol's newest branch merged in (P8 at `32569a5f`). It takes 85.4 seconds, within the run-to-run spread of AFTER, so Sol's newest changes do not remove the slowdown.

| Separate piece                                                              |      BEFORE |       AFTER |
| --------------------------------------------------------------------------- | ----------: | ----------: |
| Building the town, seconds (two runs each: the warm-up and the one-day run) | 8.2 and 6.3 | 8.0 and 6.8 |
| Simulating the first day only (`--days 1`), seconds                         |        0.51 |        1.85 |
| Peak memory over 31 days, MiB (noisy across runs)                           |       2,331 |       2,491 |

- The town builds in 6.3 to 8.2 seconds in every run, with no pattern between versions. The slowdown is per day, not per build: the first day alone is already 3.6 times slower.
- Cross-check against the full-year timing (OPUS-DRIVES, the session that ran it, commented on issue 3922 at 05:57 UTC on October 10): 59 added seconds over 31,176 work results is 1.9 milliseconds each. A year is about 367,000 work results (1,006 a day), which predicts roughly 700 added seconds. OPUS-DRIVES measured 636 and 833 added seconds on its two runs.
- Drives are off, so the donation change that came with the merge (`payDonation`, `src/core2/modules/drives.ts:954`) never ran. It appears in neither profile.

## Where the time goes

Profiled run, 31 days, one profile per version. The profiler adds overhead: 42.4 seconds for BEFORE and 103.1 for AFTER, a gap of 60.6. The profile labels every function with line 1 because the code is transpiled, so the lines below come from reading the source.

- 51.3 of the 60.6 added seconds sit under one function, `settleWorkResultJournal` (`src/core2/work-cash.ts:640`). It did not exist before.
- Garbage collection grew by 9.2 seconds, from 5.4 to 14.6. The allocation that causes it is in the same routine. (inferred)
- Everything else nets to +0.1 seconds. That is a mix of small rises (`dateTime`, `projectWorkNeeds` and `runScheduledWork`, each about +0.3) and falls (`availableActs`, -1.0). I did not trace why those moved. The three biggest life-loop functions (`chooseAct`, `availableActs`, `parameter`) are within 1 second of each other in both profiles.
- The old wage settlement (`settleWorkResult`, `src/core2/work-state.ts:236`) cost 0.74 seconds in BEFORE. The new routine under it costs 51.3.

### Hot spots (self time, seconds, profiled)

| Function and what it does                                                                                  | BEFORE | AFTER | Added |
| ---------------------------------------------------------------------------------------------------------- | -----: | ----: | ----: |
| garbage collector                                                                                          |    5.4 |  14.6 |  +9.2 |
| `verify`, `src/core2/finance-plan.ts:309` and `:939`: replays every recorded read to prove nothing changed |      0 |  13.5 | +13.5 |
| `directRead`, `src/core2/finance-plan.ts:111`: builds a property descriptor to re-check one field          |      0 |   7.4 |  +7.4 |
| `detach`, `src/core2/finance-plan.ts:393`: deep-copies and freezes a record                                |      0 |   4.7 |  +4.7 |
| `field`, `src/core2/finance-plan.ts:150`: records one field read                                           |      0 |   3.6 |  +3.6 |
| `payload`, `src/core2/finance-plan.ts:268`: records every field of a record                                |      0 |   3.6 |  +3.6 |
| `structuredClone`, called at `src/core2/work-cash.ts:611`: deep-clones the result for the caller           |      0 |   2.5 |  +2.5 |
| `finish`, `src/core2/finance-plan.ts:614`: closes the metadata plan and verifies it                        |      0 |   1.5 |  +1.5 |
| `postCashJournal`, `src/core2/journal-state.ts:1133`: posts and checks the journal entry                   |      0 |   1.4 |  +1.4 |
| `sourceReferences`, `src/core2/work-cash.ts:367`: builds the related-record references                     |      0 |   1.3 |  +1.3 |
| `chooseAct`, `src/core2/choice.ts:51`                                                                      |    6.3 |   6.2 |  -0.1 |
| `availableActs`, `src/core2/life.ts:146`                                                                   |    7.1 |   6.1 |  -1.0 |

The full top 40 by self time and by total time, with BEFORE beside AFTER, is in the appendix.

### What each work result does (counted in a scratch copy, 31 days)

A work result is one dated work segment settled with its wages, and the counter counts one per call. It does not say how many workers were paid.

| Count                                 |                Value |                                                            Per call |
| ------------------------------------- | -------------------: | ------------------------------------------------------------------: |
| Calls to `settleWorkResultJournal`    | 31,176 (1,006 a day) |                                                                     |
| Read-log replays (`verify`)           |              280,626 |                                                                 9.0 |
| Recorded reads re-checked             |        115.4 million | about 3,700 (the 2-day trace below counts 3,817; early days differ) |
| `detach` calls (deep copy and freeze) |         5.42 million |                                                                 174 |
| `payload` walks                       |         3.10 million |                                                                 100 |

The routine records every read it makes into two logs, then replays each log many times. Traced on a 2-day run (1,209 calls, 605 a day; the 31-day average is 1,006 a day and I did not trace why the first days are lower):

| Log                                          | Recorded reads per call | Replays | Where the replays happen                                                        |
| -------------------------------------------- | ----------------------: | ------: | ------------------------------------------------------------------------------- |
| Main log (what the work result read)         |               about 625 |       5 | `finance-plan.ts:895`, `:616`, `:304`, then two more in the preflight at `:952` |
| New-payload log (what the work result wrote) |               about 173 |       4 | `finance-plan.ts:617`, `:1074`, then two more in the preflight at `:953`        |

- The first three replays of the main log and the first two of the payload log run back to back inside `FinancePlanningSession.seal` (`finance-plan.ts:1067`). Nothing changes the world between them.
- The preflight replays happen twice because posting the journal entry asks the work provider for its source twice, once at `journal-state.ts:1183` and once at `:1425`. The provider ends each lookup with the preflight (`work-cash.ts:531`).

The largest sources of the main log's 625 reads, per call, are in `captureWorkContext` (`src/core2/work-cash.ts:177`), which records every field of several whole records. The commitment row at line 195 costs 133 field reads and 32 key reads. The work input at line 200 costs 53, and it includes the day's full scored decision. The age rows at line 220 cost 31. Together that is about 250 of the 625. The rest are many smaller reads (parameters, account and owner lookups, act admission) that I did not itemize. The payload log's 173 reads come from the result being written (`finance-plan.ts:1070`, `work-cash.ts:596` and the composer's `#next`, `finance-plan.ts:475`).

## The causes, ranked by share of the 60.6 added seconds

Self time counts only a function's own lines; inclusive time also counts what it calls. This table uses inclusive time, so its rows do not match the self-time hot-spot table. Cause 1 is the inclusive time of `verify`: 19.2 seconds, which contains about 5.7 seconds of `directRead` called from `verify`. The rest of `directRead`'s 7.4 seconds is called from recording and copying, which is in causes 2 and 6.

| Rank | Cause                                                                                                                                                                                           | Seconds | Share | Class | Basis                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------: | ----: | ----- | -------------------------------- |
| 1    | Replaying the read logs nine times per call (`verify`, `directRead`)                                                                                                                            |    19.2 |   32% | b     | measured                         |
| 2    | Recording every field of every record the call touches (`payload`, `field`, `mapGet`)                                                                                                           |    10.4 |   17% | b     | measured                         |
| 3    | Garbage collection from the read records, descriptors and copies made in causes 1, 2, 6 and 7                                                                                                   |     9.2 |   15% | b     | share inferred                   |
| 4    | Posting the journal entry and checking it (`journal-state.ts`, `journal.ts`: `postCashJournal`, `checkMetadata`, `projectCashJournal`, `copyResolved`)                                          |     7.5 |   12% | c     | measured seconds, class inferred |
| 5    | Call plumbing: planning the payment, building source references, admitting the selected act (`prepareWorkFinancePlan`, `sourceReferences`, `admitSelectedCashAct`, `captureWorkContext` checks) |     6.5 |   11% | c     | measured seconds, class inferred |
| 6    | Deep copy and freeze of the result (`detach`)                                                                                                                                                   |     5.0 |    8% | b     | measured                         |
| 7    | Deep clone of the result for the caller (`work-cash.ts:611`)                                                                                                                                    |     2.7 |    4% | b     | measured                         |

Causes 1, 2 and 4 to 7 add to the 51.3 seconds under the routine. With cause 3 and the +0.1 seconds elsewhere they add to 60.6.

- Class (a) was not found. No scanning function appears in the top 40 by self or total time in either profile (appendix), and this route builds no finance contracts, per Sol's (SOL-1258) note in the P16 assignment. (The profile part is measured; the no-contracts part comes from that note.)
- Class (b) is causes 1, 2, 6 and 7 (37.3 seconds, 62%) plus the garbage collection in cause 3 (9.2 seconds, 15%): about 47 seconds, 77% of the gap.
- Class (c) is causes 4 and 5: about 14 seconds, 23%. Their own garbage is inside cause 3 and cannot be separated, so 14 seconds is a floor. I call it new work because the money repair posts a balanced journal entry for each work result; I did not test whether parts of it could be cheaper.

### Proposed fixes

1. **Record only the fields the logic reads** (`src/core2/work-cash.ts:195` to `:220`). Replace each whole-record walk with the specific reads the code uses, or one revision read per record. This cuts the main log's 625 reads per call toward 150, about three quarters. Applied to causes 1 and 2 (29.6 seconds) that is up to about 22 seconds, assuming cost follows read count (inferred), and it shrinks garbage collection too. Confidence: medium. Sol must check whether each whole-record walk guards something the code relies on.
2. **Drop the five replays inside `seal`** (`finance-plan.ts:895`, `:616`, `:617`, `:304`, `:1074`). They run back to back with no world-changing code between them, and the preflight replay at the first journal lookup checks the same reads moments later. This removes 2,221 of the 3,817 read checks per call, 58% of cause 1, about 11 seconds. Confidence: high on the count; medium on safety, which Sol must confirm.
3. **Make one replayed read cheap** (`directRead`, `finance-plan.ts:111`). Reject accessors once when recording, then compare with `Object.hasOwn` and a plain read. About 5 to 7 seconds. Confidence: medium.
4. **Stop copying the day's full scored decision into every wage result** (`work-cash.ts:611`, `finance-plan.ts:1069`). `decision.scores` lists every offer scored that day (`src/core2/types.ts:334`), and it is copied, walked and cloned. Keep the selected offer, reason key and selected reasons, and return the frozen result instead of cloning it. About 8 seconds plus its garbage. Confidence: medium. I did not check whether any reader wants `decision.scores` from the stored result.

5. **Pay on payday per pay period, not after every shift** (design change, suggested by OPUS CTO). The routine runs once per dated work result, so it runs at every shift. Settling wages once per pay period would cut the number of calls by roughly the number of shifts in a period. I did not measure this and did not check what else reads the per-shift result. Confidence: not assessed.

These overlap, so their savings do not add. Fix 1 removes most of the reads that fixes 2 and 3 would make cheaper. Estimates for a 31-day run, from the 59 unprofiled added seconds (inferred, not measured):

- Fixes 1 and 4 alone save about 30 profiled seconds plus a third of the garbage collection (3.1), 33 in all. Scaled to the unprofiled run (59 of 60.6), that is 32 seconds: about 55 seconds, 2.0 times BEFORE.
- Adding fixes 2 and 3 on the reads that remain might save 3 to 5 more profiled seconds, so 50 to 52 seconds, 1.8 to 1.9 times BEFORE.
- The ceiling, if causes 1, 2, 6 and 7 vanished and half the garbage collection went with them (37.3 plus 4.6, scaled to 41 seconds), is about 46 seconds, 1.7 times BEFORE. With no garbage collection saved it is about 50 seconds.

The remaining class (c) work alone is about 14 profiled seconds, a third of BEFORE's 42, so a result inside the 20% budget is unlikely from these four fixes alone.

## What happens next

- This list and a link to this report are posted on pull request 3918, addressed to Sol (SOL-1258). Fixes 1 and 2 are the first to try, because they are the largest and the least invasive.
- Nothing is fixed in this pull request. It adds the report and my measuring scripts only.
- Open for the owner: whether the 20% speed budget applies to the new money code as it stands, or whether Sol should look for savings inside the journal work too (causes 4 and 5).
- Open for whoever measures next: rerun BEFORE and AFTER after fixes 1 and 2, and confirm the work result count.

## What I did not check

- The BEFORE work result count. I assumed the old code settled the same 31,176 work results. The per-call cost before and after (0.024 and 1.65 milliseconds, profiled) rests on that. The unprofiled 3.1 times does not.
- Whether the changed order of the work and finance modules, or the end-date change in `availableActs` (`life.ts:171`), adds work results. The life-loop self times match, so the effect is small.
- A 92-day run, and any town other than Sacramento. The routine has no place-specific logic, but I ran no other place.

## Method

- Cloud container only. Worktrees at BEFORE and AFTER; `npm ci` once, shared by both (the lockfiles are identical). One process at a time: warm-up, measured 1, measured 2, each BEFORE then AFTER.
- Command: `node --max-old-space-size=8192 --import tsx src/core2/tooling/drives-proof.ts --timing-only base --days 31`. Build time is the script's stderr line; simulate time is its `seconds` field.
- Profile: the same command with `--cpu-prof`, outputs outside the repo. My summary scripts are in this branch under `docs/reports/2026-10-10-core2-slowdown-profile-tools/`. Self time comes from sample deltas; total time counts each function once per sample.
- Counts and read origins came from a scratch worktree with counters added. That copy was reset and never committed. No game code changed, and `pool/P8-part-1` and `pool/P10-part-1` were not touched.
- The AFTER + P8 check was an uncommitted merge in a scratch worktree. It merged cleanly and changed `finance-plan.ts` by four lines.
- The first AFTER checkout was cut off by a command timeout; I removed it and redid it.

SONNET-PROFILE

## Appendix: top 40 functions, BEFORE beside AFTER

Seconds in the profiled run. File and line come from the AFTER tree; a few shared functions sit a few lines apart in BEFORE. Total (inclusive) time for the anonymous function in `src/core2/state.ts` rises because it is the wrapper that calls the work provider during journal posting (`state.ts:461`); it is not the life loop.

**Top 40 by self time in AFTER (BEFORE value alongside)**

| #   | Function                                                         | BEFORE s | AFTER s | Added s |
| --- | ---------------------------------------------------------------- | -------: | ------: | ------: |
| 1   | (garbage collector) :0                                           |      5.4 |    14.6 |    +9.2 |
| 2   | verify `src/core2/finance-plan.ts:309`                           |      0.0 |    13.5 |   +13.5 |
| 3   | directRead `src/core2/finance-plan.ts:111`                       |      0.0 |     7.4 |    +7.4 |
| 4   | chooseAct `src/core2/choice.ts:51`                               |      6.3 |     6.2 |    -0.1 |
| 5   | availableActs `src/core2/life.ts:146`                            |      7.1 |     6.1 |    -1.0 |
| 6   | detach `src/core2/finance-plan.ts:393`                           |      0.0 |     4.7 |    +4.7 |
| 7   | field `src/core2/finance-plan.ts:150`                            |      0.0 |     3.6 |    +3.6 |
| 8   | payload `src/core2/finance-plan.ts:268`                          |      0.0 |     3.6 |    +3.6 |
| 9   | (anonymous) `src/core2/state.ts`                                 |      3.2 |     3.2 |    +0.0 |
| 10  | parameter `src/core2/parameters.ts:37`                           |      3.0 |     3.0 |    -0.0 |
| 11  | structuredClone (node:internal/worker/js_transferable)           |      0.0 |     2.5 |    +2.5 |
| 12  | activate `src/core2/life.ts:211`                                 |      1.5 |     1.7 |    +0.2 |
| 13  | finish `src/core2/finance-plan.ts:614`                           |      0.0 |     1.5 |    +1.5 |
| 14  | postCashJournal `src/core2/journal-state.ts:1133`                |      0.0 |     1.4 |    +1.4 |
| 15  | sourceReferences `src/core2/work-cash.ts:367`                    |      0.0 |     1.3 |    +1.3 |
| 16  | compileSourceTextModule (node:internal/modules/esm/utils)        |      1.3 |     1.2 |    -0.1 |
| 17  | (anonymous) `src/core2/journal-state.ts`                         |      0.0 |     0.9 |    +0.9 |
| 18  | seal `src/core2/finance-plan.ts:303`                             |      0.0 |     0.8 |    +0.8 |
| 19  | mapGet `src/core2/finance-plan.ts:170`                           |      0.0 |     0.8 |    +0.8 |
| 20  | (anonymous) `src/core2/choice.ts`                                |      0.3 |     0.7 |    +0.4 |
| 21  | (anonymous) `src/core2/modules/life.ts`                          |      0.5 |     0.6 |    +0.1 |
| 22  | dateTime `src/core2/emotion.ts:62`                               |      0.3 |     0.6 |    +0.3 |
| 23  | compareLifePlaceSearchOrder `src/simulation/life-places.ts:726`  |      0.6 |     0.6 |    -0.0 |
| 24  | checkMetadata `src/core2/journal-state.ts:1056`                  |      0.0 |     0.6 |    +0.6 |
| 25  | settleWorkResultJournal `src/core2/work-cash.ts:640`             |      0.0 |     0.5 |    +0.5 |
| 26  | knownPublicTargets `src/core2/modules/life.ts:46`                |      0.5 |     0.5 |    +0.0 |
| 27  | projectCashJournal `src/core2/journal.ts:137`                    |      0.0 |     0.5 |    +0.5 |
| 28  | projectWorkNeeds `src/core2/life.ts:104`                         |      0.2 |     0.5 |    +0.3 |
| 29  | (anonymous) `src/core2/deep-past.ts`                             |      0.6 |     0.5 |    -0.1 |
| 30  | protectJournalObjects `src/core2/journal-state.ts:170`           |      0.0 |     0.5 |    +0.5 |
| 31  | runScheduledWork `src/core2/modules/work.ts:307`                 |      0.1 |     0.4 |    +0.3 |
| 32  | discretionaryHours `src/core2/modules/work.ts:264`               |      0.4 |     0.4 |    -0.0 |
| 33  | childhoodFamilyContext `src/simulation/people-upbringing.ts:879` |      0.4 |     0.4 |    -0.0 |
| 34  | (idle) :0                                                        |      0.4 |     0.4 |    +0.0 |
| 35  | (anonymous) `src/core2/finance-plan.ts`                          |      0.0 |     0.4 |    +0.4 |
| 36  | makeIsoDate `src/simulation/dates.ts:50`                         |      0.2 |     0.4 |    +0.1 |
| 37  | set TextDecoder :0                                               |      0.2 |     0.4 |    +0.2 |
| 38  | validateCommittedAct `src/core2/state.ts:561`                    |      0.3 |     0.4 |    +0.1 |
| 39  | traitScore `src/core2/choice.ts:14`                              |      0.4 |     0.3 |    -0.0 |
| 40  | observe `src/core2/state.ts:660`                                 |      0.5 |     0.3 |    -0.1 |

**Top 40 by self time in BEFORE that fall out of AFTER's top 40**

| Function                                                             | BEFORE s | AFTER s |
| -------------------------------------------------------------------- | -------: | ------: |
| refreshNeeds `src/core2/life.ts:71`                                  |      0.4 |     0.3 |
| lineLengths (node:internal/source_map/source_map_cache)              |      0.3 |     0.3 |
| (anonymous) `src/simulation/local-institutions.ts`                   |      0.3 |     0.3 |
| openingTraits `src/core2/population.ts:404`                          |      0.3 |     0.2 |
| stopgap `src/core2/stopgaps.ts:20`                                   |      0.3 |     0.3 |
| drawFamilyShape `src/simulation/family-shape.ts:26`                  |      0.2 |     0.2 |
| settleWorkResult `src/core2/work-state.ts:236`                       |      0.2 |     0.1 |
| (anonymous) `src/core2/population.ts`                                |      0.2 |     0.2 |
| drawCohortGivenName `src/simulation/given-name-cohorts.ts:84`        |      0.1 |     0.1 |
| recordAct `src/core2/state.ts:837`                                   |      0.1 |     0.1 |
| waitForWorker (node:internal/modules/esm/hooks)                      |      0.1 |     0.1 |
| recordsByStringField `src/simulation/history-index.ts:226`           |      0.1 |     0.1 |
| (anonymous) `src/simulation/living-world/town-employment.ts`         |      0.1 |     0.1 |
| fork `src/simulation/rng.ts`                                         |      0.1 |     0.1 |
| makeAsyncRequest (node:internal/modules/esm/hooks)                   |      0.1 |     0.1 |
| (anonymous) `src/districts/place-precinct-population.generated.json` |      0.1 |     0.1 |
| lookupPublicOrganization `src/core2/state.ts:971`                    |      0.1 |     0.1 |

**Top 40 by total (inclusive) time in AFTER (BEFORE value alongside)**

| #   | Function                                                | BEFORE s | AFTER s | Added s |
| --- | ------------------------------------------------------- | -------: | ------: | ------: |
| 1   | (root) :0                                               |     42.4 |   103.1 |   +60.6 |
| 2   | evaluate :0                                             |     34.4 |    86.0 |   +51.6 |
| 3   | run (node:internal/modules/esm/module_job)              |     34.4 |    86.0 |   +51.6 |
| 4   | main `src/core2/tooling/drives-proof.ts:268`            |     33.7 |    85.4 |   +51.7 |
| 5   | (anonymous) `src/core2/tooling/drives-proof.ts`         |     33.7 |    85.4 |   +51.7 |
| 6   | run `src/core2/tooling/drives-proof.ts:50`              |     27.5 |    78.8 |   +51.3 |
| 7   | advanceCore `src/core2/life.ts:276`                     |     27.1 |    78.3 |   +51.2 |
| 8   | runScheduledWork `src/core2/modules/work.ts:307`        |      1.8 |    54.3 |   +52.5 |
| 9   | settleWorkResult `src/core2/state.ts:724`               |      0.8 |    51.5 |   +50.7 |
| 10  | settleWorkResult `src/core2/work-state.ts:236`          |      0.7 |    51.5 |   +50.7 |
| 11  | settleWorkResultJournal `src/core2/work-cash.ts:640`    |      0.0 |    51.3 |   +51.3 |
| 12  | submit `src/core2/work-cash.ts:559`                     |      0.0 |    36.0 |   +36.0 |
| 13  | activate `src/core2/life.ts:211`                        |     25.1 |    23.6 |    -1.5 |
| 14  | verify `src/core2/finance-plan.ts:309`                  |      0.0 |    19.2 |   +19.2 |
| 15  | postJournal `src/core2/state.ts:669`                    |      0.0 |    16.4 |   +16.4 |
| 16  | postCashJournal `src/core2/journal-state.ts:1133`       |      0.0 |    16.0 |   +16.0 |
| 17  | seal `src/core2/finance-plan.ts:303`                    |      0.0 |    15.6 |   +15.6 |
| 18  | (anonymous) `src/core2/state.ts`                        |      4.3 |    14.9 |   +10.5 |
| 19  | (garbage collector) :0                                  |      5.4 |    14.6 |    +9.2 |
| 20  | availableActs `src/core2/life.ts:146`                   |     12.2 |    11.0 |    -1.2 |
| 21  | workCashSourceProvider `src/core2/work-cash.ts:467`     |      0.0 |    10.5 |   +10.5 |
| 22  | chooseAct `src/core2/choice.ts:51`                      |      9.0 |     9.3 |    +0.3 |
| 23  | finish `src/core2/finance-plan.ts:614`                  |      0.0 |     8.4 |    +8.4 |
| 24  | directRead `src/core2/finance-plan.ts:111`              |      0.0 |     7.4 |    +7.4 |
| 25  | payload `src/core2/finance-plan.ts:268`                 |      0.0 |     6.4 |    +6.4 |
| 26  | buildPopulation `src/core2/population.ts:459`           |      5.4 |     5.9 |    +0.5 |
| 27  | field `src/core2/finance-plan.ts:150`                   |      0.0 |     5.3 |    +5.3 |
| 28  | detach `src/core2/finance-plan.ts:393`                  |      0.0 |     5.0 |    +5.0 |
| 29  | captureWorkContext `src/core2/work-cash.ts:177`         |      0.0 |     4.8 |    +4.8 |
| 30  | stageWorkConsequences `src/core2/work-cash.ts:230`      |      0.0 |     4.0 |    +4.0 |
| 31  | mapSet `src/core2/finance-plan.ts:536`                  |      0.0 |     3.4 |    +3.4 |
| 32  | #next `src/core2/finance-plan.ts:475`                   |      0.0 |     3.3 |    +3.3 |
| 33  | (anonymous) `src/core2/population.ts`                   |      3.1 |     3.0 |    -0.0 |
| 34  | parameter `src/core2/parameters.ts:37`                  |      3.0 |     3.0 |    -0.0 |
| 35  | (anonymous) `src/core2/modules/life.ts`                 |      2.7 |     2.8 |    +0.1 |
| 36  | structuredClone (node:internal/worker/js_transferable)  |      0.0 |     2.7 |    +2.7 |
| 37  | (anonymous) `src/core2/choice.ts`                       |      2.2 |     2.7 |    +0.4 |
| 38  | prepareWorkFinancePlan `src/core2/finance-plan.ts:1647` |      0.0 |     2.5 |    +2.5 |
| 39  | (anonymous) `src/core2/life.ts`                         |      0.8 |     2.2 |    +1.4 |
| 40  | admitSelectedCashAct `src/core2/act-cash.ts:47`         |      0.0 |     2.1 |    +2.1 |

**Top 40 by total time in BEFORE that fall out of AFTER's top 40**

| Function                                                                   | BEFORE s | AFTER s |
| -------------------------------------------------------------------------- | -------: | ------: |
| openingTraits `src/core2/population.ts:404`                                |      2.1 |     2.1 |
| afterLoad (node:internal/modules/esm/loader)                               |      1.9 |     1.6 |
| #translate (node:internal/modules/esm/loader)                              |      1.9 |     1.6 |
| compileSourceTextModule (node:internal/modules/esm/utils)                  |      1.8 |     1.6 |
| moduleStrategy (node:internal/modules/esm/translators)                     |      1.8 |     1.6 |
| upbringingFor `src/simulation/people-upbringing.ts:1103`                   |      1.8 |     1.8 |
| readUpbringing `src/simulation/people-upbringing.ts:1130`                  |      1.8 |     1.8 |
| knownPublicTargets `src/core2/modules/life.ts:46`                          |      1.6 |     1.5 |
| discretionaryHours `src/core2/modules/work.ts:264`                         |      1.5 |     1.4 |
| childhoodFamilyContext `src/simulation/people-upbringing.ts:879`           |      1.5 |     1.5 |
| refreshNeeds `src/core2/life.ts:71`                                        |      1.2 |     1.1 |
| selectedPlace `src/core2/population.ts:174`                                |      0.9 |     0.9 |
| writeWithWorldIntegrityOnce `src/simulation/world.ts:633`                  |      0.8 |     0.8 |
| ensureTownEmployment `src/simulation/living-world/town-employment.ts:1230` |      0.8 |     0.8 |
| withWorldIntegrityDeferred `src/simulation/world.ts:600`                   |      0.8 |     0.8 |
| buildDeepPast `src/core2/deep-past.ts:109`                                 |      0.8 |     0.6 |
| realLocalities `src/core2/places.ts:11`                                    |      0.7 |     0.7 |
| fillTownJobs `src/simulation/living-world/town-employment.ts:1380`         |      0.7 |     0.7 |
| (anonymous) `src/core2/places.ts`                                          |      0.7 |     0.7 |
