# State intake is faster when the copy transaction ends before decisions

A bounded change reduced a fresh cloud month from 28.970 seconds to 26.768 seconds, or 7.60 percent. All people, decisions, events and the complete saved-world fingerprint matched. The fifteen-second target still failed. Two broader copy experiments produced no improvement and were reverted while preserving their commits and receipts.

## MERGED

Team 4 merged nothing. This follow-up is based on PR 1165's integrated head `0b739f88be83fda9ba4a911adaa2330eaca4ad9c`. The parent was open at the latest read, with exact-head CTO approval recorded in the coordinator document. Fetched main remained `a18f22a76b2b41c01ff030026024eb940ccefbef`; the parent head was not its ancestor. Merge owns integration and approval verification. PR 1162 was previously closed as superseded by Merge's preserved consolidation.

## WHAT EMERGED

MEASURED: South Fork, Pennsylvania, place `4272168`, seed `b18-f375512c`, advanced from January 5 through February 4, 2026. The baseline and every candidate used the same cloud machine, runtime, seed, place and thirty-day route.

| Run                               | Exact source head                        | Month seconds | Disposition                                       |
| --------------------------------- | ---------------------------------------- | ------------: | ------------------------------------------------- |
| Integrated parent baseline        | 0b739f88be83fda9ba4a911adaa2330eaca4ad9c |     28.970257 | Baseline                                          |
| Whole-intake history transaction  | d2d819fb863359534b9c7b687ad2b08807b38c0f |     31.053683 | Rejected; reverted                                |
| Direct dictionary construction    | 2d84f5d33c0a9bf97d0565c01f0f343308473a91 |     29.032794 | No demonstrated improvement; reverted             |
| Incumbent trait-batch transaction | f1087731d162984b5ec0b0781f3bf080a46afaa6 |     26.768319 | Bounded improvement; fifteen-second target failed |

HARDWIRED: the existing `seedDates` batch in `src/simulation/nationwide-world/state-legislature-turnover.ts` now defers physical personality-history copies only while `ensurePeopleTraits` runs. The actor list, first-record dates, canonical writers, seeded values and write order remain unchanged. The transaction restores an ordinary array before decisions and candidate slates read it.

HARDWIRED: `src/simulation/history-index.ts` keeps each intermediate append as an immutable view of its original array and appended chunks. It materializes the final array once and preserves append lineage for existing lookup indexes. Inactive writers retain the existing concat route. Branches, nested transactions and refusals retain their source snapshots.

MEASURED: advancement-only profile self costs for the retained candidate were:

| Frame                               | Source                | Self seconds |
| ----------------------------------- | --------------------- | -----------: |
| createCharacterHistoryContextPeople | character-history.ts  |     3.771433 |
| anonymous district-residence frame  | district-residence.ts |     1.157031 |
| appendedList                        | history-index.ts      |     1.125020 |
| fork                                | rng.ts                |     1.068277 |
| anonymous life frame                | life.ts               |     1.028695 |

These are sampled CPU costs within the `advanceObservedWorld` call tree. Opening, compiler startup and post-run fingerprint serialization are excluded from that table. Garbage collection cannot be assigned by that ancestry filter.

## Wider knock-on effects and missing links

All four runs contain the same 15,024 people, 9,225 decisions and 20,037 events. Every comparison has zero errors, zero decision-position changes and the identical full fingerprint `689a517520e1804ffe07c3d453fa9a08de7b3ccd048b3c9b077cea577817230b`. This integrated baseline differs from the earlier PR 1165 measurement baseline; the earlier 20,041-event count is historical, not a current result.

No outcome is marked DECIDED because these receipts do not inspect actor reasons. No habit, schema, legal value, date, seeded identity or outcome rule changed. The Team 5 appended-person seam remains a plan only: newly appended IDs, no roster scan or reroll, missing education never assigned a low category.

The whole-intake transaction saved some append time but slowed the month. Restricting its lifetime to trait seeding avoids retaining history views through decisions and candidate generation. The dictionary construction microbenchmark did not translate into a monthly gain. Neither rejected experiment remains in the final runtime diff.

The next bounded investigation is the remaining state-intake roster copies across one day's separate states. It must preserve immutable intermediate worlds and every actor's original date. Another once-per-state batch duplicates existing work. No broader roster transaction has been implemented or measured. Group D remains deferred while speed profiling works.

## VITAL STATISTICS

The retained change saves 2.201939 seconds, or 7.60 percent, in this fresh comparison. It is 11.768319 seconds above the strict fifteen-second threshold. The semantic comparison passed; the speed target failed. There is no claimed annual or multi-place speed result.

## NEEDS LAMONTAE

No product decision is needed for this bounded repair. Coordinator and Merge own the parent-first integration route. The recurring reporter could not be set: available automations permit at most hourly runs and expose no direct hostlocal cross-thread delivery. There is no automation ID. CTO's September 29, 11:37 p.m. Eastern reply accepts the coordinator's local :25/:55 collector as coverage; no retries or substitute schedule were created.

## PLACEHOLDERS

No new simulation estimates, rates, thresholds or legal placeholders were introduced. This place and seed are measurement inputs, not world defaults.

## Checks and method

Final transaction tests passed 8/8. Scoped ESLint, Prettier and whitespace passed. The final narrowed call-site typecheck passed across three roots with zero changed-file diagnostics. Report check passed with zero errors and warnings. Zero-dice reported zero new and two stale allowances in pressure/events.ts; both that source blob and the allowance blob exactly match fetched main. The shared allowlist was not edited. Spelling first refused child-process execution with spawnSync git EPERM. Its explicit-runtime-network retry found four existing quoted British examples in unchanged plain-american-wording.md and none in the then-tracked owned files. Final spelling, after tracking the new documents, again found only those four existing quoted examples. Exact-range PR release check failed on the unchanged wave1-record-backed-content.md declaration missing its header. The owned declaration parser and exact-range declaration transition independently passed with zero problems. All three global failures were then actually reproduced on clean fetched main in this same checkout: release, zero-dice and spelling each exited 1 with the same findings. The speed branch was restored without edits. These inherited exceptions leave the bounded source repair READY under the local gate rule. Full suite, annual simulations and report-reviewer delegation are NOT RUN under the current rules and helper limit.

Rejected experiments remain at their named commits, followed by additive reverts `1c9a20cc9` and `db055da30`. No reset, stash, clean, deletion, extra checkout or force-push occurred. Raw receipts, profiles, logs and comparison files remain preserved under ignored `test-results/speed/` in the single registered checkout.

| Raw artifact                                 |   Bytes | SHA-256                                                          |
| -------------------------------------------- | ------: | ---------------------------------------------------------------- |
| cloud-intake-before.json                     | 8500538 | ce89accb722e98dd6fbb96f8feb9bc42346ceeffbb3b51459cea9063f3c208be |
| cloud-intake-after.json                      | 8500538 | 7c8b212fb07de8d6d4dd536dd94e2b52fb0469e19dd04903c51979bdf6d377a8 |
| cloud-dictionary-after.json                  | 8500538 | 1bb92da36c95a6ceaadce1c66ac59af4f71c704f9a27dd97a49c569e26a298be |
| cloud-intake-seed-after.json                 | 8500532 | b4f72c0515da6b3e49f739d598d1e2d6b922955d1fd245ba7661f888b94a2a81 |
| cloud-intake-seed-after.json.comparison.json |      57 | a8a59c56f958d3ff48c6f06049b45af87b5b53977f0c7defae69d1dc81af5f2d |
| cloud-intake-integrated-before.cpuprofile    | 3665332 | bed6ed87d97502459eb23005235e65f4a95891aac2a755649553079330e3dc29 |
| cloud-intake-after.cpuprofile                | 3814965 | 88f6b610c0c608794b16f3a01ba7b712d6595329b0038065ff4ebdf24b206cf0 |
| cloud-dictionary-after.cpuprofile            | 3586919 | de4c6c0304dad37f80ee77ecc7b39072dc7e2edada9816171ebaee62644b3a13 |
| cloud-intake-seed-after.cpuprofile           | 3638169 | 42541fedaad3c862e397273ed9daf2fb9ed79455589f399ef0cc71a5094e8416 |

Commands used `OCD_STORAGE_STATE_DIR=/workspace/.ocd-dev OCD_WORKSPACE_OWNER=TEAM4 npm run storage -- run test --` with the unchanged 25 GiB reserve. All month commands used `node --max-old-space-size=4096 --cpu-prof --cpu-prof-dir=test-results/speed --cpu-prof-name=<named profile> --import tsx scripts/speed-years/month.ts --out <named receipt>`. Candidates added `--before test-results/speed/cloud-intake-before.json --limit 15`; their exit 1 was the explicitly reported speed-target failure after successful semantic comparison. Node v24.19.0 ran on cloud host 8469eb03ed6a. The original 473-byte handoff profile and its hash remain preserved unchanged.
