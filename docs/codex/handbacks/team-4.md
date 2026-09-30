# The watched world still takes minutes to advance

The incumbent batch and month comparator are ready. Each eligible actor keeps the original intake date; candidate people are created through the existing batch writer. Historical and date-preservation checks pass. Timing has not started: Team 4 is waiting for the coordinator to confirm reversible pauses of Team 1 and Team 3. The latest gate is one watched month below 15 seconds, with the same people, decisions and recorded results. Permitted history-position changes will be disclosed separately.

## READY TO TIME — coordinator grant pending

Source checkpoint: `42e5077cd2db3417f8c21c872fba672ff42fa970` on `codex/wave1-speed`. No Team 4 simulation is running. Other owners’ jobs have not been stopped by Team 4.

Expected window: 4–6 minutes for both runs, including world opening, saving and hashing. The time limit applies only to candidate simulation advancement. The baseline is expected to take longer. Use the SAME registered workspace; no source copy.

1. Preserve the source checkpoint and handback, copy only the measurement tool to `/private/tmp/team4-month-proof.mts`, then switch this workspace to the preserved `c43e03e16` source after the grant.
2. Baseline command:

```sh
npm run storage -- run test -- node --max-old-space-size=4096 --import tsx /private/tmp/team4-month-proof.mts --root /private/tmp/wt-gate-1125 --out test-results/speed/baseline-month.json
```

3. After baseline exit, restore `codex/wave1-speed`. Candidate command:

```sh
npm run storage -- run test -- node --max-old-space-size=4096 --import tsx scripts/speed-years/month.ts --out test-results/speed/candidate-month.json --before test-results/speed/baseline-month.json --limit 15
```

The comparison stores full-person hashes in person order, hashes of all decision packets/evaluations, and hashes of every recorded event. Only history sequence and cutoff-sequence fields are removed from the latter two. Different people, choices, decision facts or event results fail. It also saves full-world fingerprints and an explicit per-decision sequence/cutoff diff. No semantic pass or timing pass is claimed yet.

## MERGED

Nothing has been merged or published. The local source checkpoint is `42e5077cd2db3417f8c21c872fba672ff42fa970` on `codex/wave1-speed`. It includes the earlier timing tools. The preserved comparison baseline is `cdb6e4ab1d6a26aa876d99f6831570ed0c057d92`.

## WHAT EMERGED

MEASURED: the supplied Claude month profile at source `6183fb119` attributes most advancement time to state legislature turnover. Team 4 independently profiled the first month after its initial caches. January 5 through February 4 took 224.847 seconds under the authorized shared load. State turnover remains the dominant cost. This is a monthly diagnostic, not the annual proof.

HARDWIRED: `prepareStateCandidateSlates` already collects prospective people and calls the batch context-person writer once per invocation. Trait seeding occurs between decisions. Moving all seeds before the decision loop would change history sequence order when records are added. The repair must preserve that order.

CHANGED: append-aware history indexes now use their existing lineage proof. Candidate pools transfer only when the context-person writer proves that it copied the old people table unchanged and appended new people. External edits rebuild. Stored extenders hold the version, without retaining earlier worlds. Appearance lineage follows immutable people tables. An empty context-person batch returns immediately.

HISTORICAL GATE: the two-year fingerprint and year-one-under-60-second requirement was subsequently superseded by the one-month gate above. The timing tool records coordinated coexistence without claiming an empty machine. Up to two other authorized heavy jobs may run alongside Team 4. Actual load remains part of the measurement.

## Wider knock-on effects and missing links

The measured scans below were released by Team 1 at `e7317b119`, followed by the root’s explicit speed-priority override. They are now implemented. Published query, mind and life-query deltas were reused; the private affiliation maps transfer ownership after a proven append.

| Helper                                                             | Measured monthly evidence                                   | Required preservation                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------- |
| `queries.ts:personalityTendencyHistory`                            | Repeated trait reads inside 63.386 seconds of trait seeding | Cutoff validation, availability and date/sequence sorting  |
| `mind.ts:validateImmediateSupersession`                            | 7.504 seconds self; personality writer 16.065 seconds self  | Last array match, prior-ID validation and refusal behavior |
| `life-queries.ts:recordsForId`                                     | 21.945 seconds self                                         | Each caller’s existing cutoff and state interpretation     |
| `nationwide-world/state-legislature-opening.ts:affiliationIndexes` | 8.403 seconds self                                          | First party and last stable-key match                      |

The original proposal is `/private/tmp/team4-proposed-trait-indexes.patch`. Final implementation reused the useful published Team 1 deltas and preserves law edits; it did not replace whole files. The confirmed local-election handoff covers only batching around the two `decideAnotherTerm` callers. It does not release these other helpers. No local-election edits have been made yet.

Automatic approval review previously rejected outgoing coordinator messaging because direct human authorization for that destination was not established. The coordinator said to use this chat and handback. The coordinator is handling pauses and handoffs directly. The earlier messaging authorization question is obsolete; no messaging workaround has been used.

Group D remains preserved separately at `83a0e2627` on `codex/wave1-place-rules`, deferred until the speed PR opens. It moves 25 place checks, with 2 remaining in Team 1’s claimed `question-authority.ts`. Its formatting, lint and zero-dice check passed; behavior and speed checks have not run. Its allowlist is 192. The active speed branch retains 217.

## VITAL STATISTICS

The watched route is South Fork, Pennsylvania, seed `b18-f375512c`. Annual serialization and hashing are outside the simulation timer.

| Run                     | Year | Simulation seconds | Saved-world SHA-256                                                |
| ----------------------- | ---: | -----------------: | ------------------------------------------------------------------ |
| Earlier interrupted run |    1 |      615.557750583 | `7733ca4caff4df3d5f8f2691faa03a4deb97e9b692c170f639481c31bc4febf6` |
| Earlier interrupted run |    2 |      279.335250375 | `86b9b14245bcef980ce560984625131f10f4a79357a1ecb16e96ca85ff828db5` |
| Earlier interrupted run |    3 |     1315.790787709 | `77ecd4511c6621f16c276c1132616bf51146c68d94a899ee6ce69c539143ded2` |
| Fresh stopped run       |    1 |      515.912439750 | `7733ca4caff4df3d5f8f2691faa03a4deb97e9b692c170f639481c31bc4febf6` |
| Fresh stopped run       |    2 |      333.683822042 | `86b9b14245bcef980ce560984625131f10f4a79357a1ecb16e96ca85ff828db5` |

The 615.558-second figure is from the earlier run. The 515.912-second figure is from the fresh run. Neither evidence file was overwritten. Births, deaths, moves, crime and business openings have not been tabulated.

## NEEDS LAMONTAE

No product decision is pending. Timing awaits the coordinator’s pause acknowledgments and grant. No owner product decision or messaging authorization is needed for the current route.

## PLACEHOLDERS

South Fork and the seed are benchmark defaults, not normal-start game defaults. No new simulation stand-in has been added. Existing Minnesota, Alaska and Charlottesville refusals remain in the deferred place-rule candidate.

## Method and ownership

Team 4 reuses registered workspace `/private/tmp/wt-gate-1125`; the dirty root checkout is preserved. Claims were appended under the canonical atomic lock. Newly claimed paths cover the candidate-pool helper/test, context-person writer/test and people-trait writer/test. The four released helper scopes are implemented in Team 4’s workspace. Team 1 receives the speed delta afterward under the latest override.

Verified owned fresh PID 33187 received SIGTERM and exited 143. The wrapper released its reservation. Fresh receipt: `test-results/speed/main-fresh-stopped-two-years.json`; log: `/private/tmp/team4-main-speed-fresh-stopped-two-years.log`. Its `sourceMain` is null because shared `origin/main` advanced during launch. The actual timing-tool head was `c43e03e16`; simulation source remained the baseline above. Earlier receipt: `test-results/speed/main-interrupted-20260929.json`.

Executed checks: preflight; 16 focused tests across candidate pool, context-person batch, history index and speed comparison; changed files plus imported TypeScript dependencies; changed-file ESLint and formatting; zero-dice; release declarations over `6183fb119..0a8ab7b39`. All passed. The older interrupted TypeScript attempts produced no result and are not counted as passes. Full unit, browser, native runtime and annual candidate identity checks have not run.

Independent initial monthly profile: `test-results/speed/month-caches.cpuprofile`, summarized at `/private/tmp/team4-month-caches-summary.txt`. Follow-up append-index month: exited 0 after 406.793110417 seconds. Log: `/private/tmp/team4-month-append-index.log`; profile: `test-results/speed/month-append-index.cpuprofile`; summary: `/private/tmp/team4-month-append-index-summary.txt`. Candidate-pool plus append-index self time fell from 17.427818 seconds to 0.084749 seconds, summing the named candidate-pool, add, lookup and transfer frames. Total month time worsened; no overall improvement is claimed. Trait seeding remains 104.617 seconds inclusive, participation grouping 49.755 seconds self. Available memory was 39 percent after completion. Other Node jobs and macOS background jobs consumed CPU; they were observed without being stopped.

The owner-report reviewer has not run under the wave’s helper limit. No report acceptance is claimed.

## Deferred allowlist composition

Leave these entries until their source is actually received. They are outside the speed PR.

- Team 2: the Build 27 cross-party cosponsor roll in `src/simulation/governing/congress-lawmaking.ts`.
- Team 5: the Build 19 fixed share and roll in `src/simulation/pressure/events.ts`, only after source `f99e10b48b17efb31a0f32fde7eb8631a01052c5` from draft PR 1134 is received.

## Latest executed checks

The pre-batch helper suite passed 44 tests across 7 files. After incumbent batching, the date, another-term, month-comparison and historical suites passed 34 tests across 6 files. Final changed-file TypeScript, ESLint, formatting, zero-dice and release declarations passed. The state-opening/turnover integration run was broader than the priority gate: it was stopped after verifying owned runner/worker PIDs, and exited 143. Its preserved log is `/private/tmp/team4-state-batch-integration.log`; no integration result is claimed. That suite remains pending after the bounded proof. No assertions, test timeouts or exclusions were changed.
