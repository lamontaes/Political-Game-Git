# The cloud month is faster, but still above fifteen seconds

The first cloud month completed, and a bounded roster-copy repair reduced a fresh comparison from 29.048 seconds to 26.951 seconds. All people, decisions, events and the full saved-world fingerprint matched. The fifteen-second target failed. The published lazy-copy repair alone showed no meaningful monthly improvement. Current main lacks that earlier repair, although GitHub marks its feature-branch pull request merged.

## MERGED

Team 4 merged nothing. The single registered cloud checkout is `/workspace/Political-Game-Git`, owned by TEAM4. The local predecessor, its claims and evidence remain preserved pending coordinator acceptance.

PR 1145's speed helpers are on verified main `4a2be71b13f5361ebedb4d49d63c0ce4deddb35f`. Its merge `5bdf4de09ee092d85c34ea1096566a134dc403df` is an ancestor of main. PR 1151's lazy-copy merge `a6ad6cf497ed008e3bbccbd51a476a244ec51489` is not. Its base was the speed branch. The exact main source still eagerly copies existing-only rosters. This candidate preserves the published lazy-copy change and adds the explicit-key copy repair. No existing work was overwritten.

PRs 1153 and 1154 remain open at the reads used for this work. Their allowlist changes are untouched. Group D remains deferred.

## WHAT EMERGED

MEASURED: South Fork, Pennsylvania, place `4272168`, seed `b18-f375512c`, advanced from January 5 through February 4. The profile's simulation timer was 29.449912 seconds. These are new cloud measurements, not the earlier Mac results.

MEASURED: the complete CPU profile's five largest self frames were:

| Function                            | File                                 | Self seconds |
| ----------------------------------- | ------------------------------------ | -----------: |
| createCharacterHistoryContextPeople | src/simulation/character-history.ts  |     6.018067 |
| runCallSync                         | node_modules/esbuild/lib/main.js     |     3.944395 |
| appendedList                        | src/simulation/history-index.ts      |     3.638372 |
| garbage collector                   | Runtime frame                        |     1.627248 |
| anonymous frame                     | src/simulation/district-residence.ts |     1.072766 |

The profiler includes opening and compiler startup outside the advancement timer. Samples with an `advanceObservedWorld` ancestor give these five advancement self costs: context people, 5.846878 seconds; appendedList, 3.638372 seconds; district-residence anonymous frame, 1.072766 seconds; life.ts anonymous frame, 1.022303 seconds; rng.ts fork, 0.916504 seconds. Garbage collection has no advancement ancestor, so that subtree cannot allocate its time.

| Previously expensive helper         |          Whole-profile self seconds |                   Inclusive seconds |
| ----------------------------------- | ----------------------------------: | ----------------------------------: |
| createCharacterHistoryContextPeople |                            6.018067 |                            6.454858 |
| recordsForId                        | No sampled frame under the old name | No sampled frame under the old name |
| pastCandidatesBySeat                |                            0.000000 |                            0.004444 |
| affiliationIndexes                  |                            0.002134 |                            0.047550 |

The indexed replacement `recordsByStringField` costs 0.253302 seconds self and 0.847651 seconds inclusive. `addPastCandidates` costs 0.015309 seconds self and inclusive. Missing old names do not establish zero replacement cost. The repeated lookup costs are reduced; context-person copying remains substantial.

MEASURED: 5.695762 seconds of context-person self samples came from state candidate intake. Inspection confirms incumbent traits and prospective context people are already batched per state intake invocation. Another identical batch is not a new fix. Daily intake still creates fresh batches and copies the growing roster.

HARDWIRED: the owned context-person writer now uses the existing own-key order when copying a large roster. See `src/simulation/character-history.ts:674`. It preserves immutable source worlds and delays copying until a new person is needed. The new reload regression compares property order and complete canonical worlds against the existing single-person writer.

## Wider knock-on effects and missing links

The full fingerprint, all 15,024 people in order, 9,225 decisions and 20,041 events matched in both candidate comparisons. No decision sequence or cutoff position changed. No outcome is labeled DECIDED because this timing receipt does not inspect any actor's recorded reason.

The copy repair reduced this same-machine month by 2.097 seconds, or 7.22 percent. It does not complete the speed goal. A broader state-intake transaction could avoid repeated roster copies, but its date and decision dependencies need a bounded design before editing. The next investigation stays inside state intake; it must preserve each intake date and prove people, decisions and events again. The four released helper scopes remain the limit. No new helper is authorized.

## VITAL STATISTICS

| Fresh cloud run                 | Source head                              | Simulation seconds | Equality                   |
| ------------------------------- | ---------------------------------------- | -----------------: | -------------------------- |
| Main-source profile             | 6cbd24295ea9c4d366c0242d7c1b03f2ef9d96d8 |          29.449912 | Profile only               |
| Fresh main-source baseline      | 6cbd24295ea9c4d366c0242d7c1b03f2ef9d96d8 |          29.048426 | Baseline                   |
| Exact published lazy-copy delta | a398b7c42df81e242c198d4c008f03da48fb4668 |          29.021410 | Full fingerprint identical |
| Explicit-key copy candidate     | f6eda5fc7b402c52ea71238cd61690d718156d77 |          26.951218 | Full fingerprint identical |

All three saved receipts have fingerprint `c379e3d94064d5ed7bb79cd462f7bc553b43242d6344a7a639227028702d4fdf`. Candidate commands exited 1 solely because their month exceeded fifteen seconds. Semantic comparison errors and decision-position changes were zero.

## NEEDS LAMONTAE

No product decision is needed. Coordinator and Merge need to reconcile the missing main integration of PR 1151 under the current exact-head approval route. Team 4 does not merge. Central claims and local-predecessor release remain coordinator responsibilities.

## PLACEHOLDERS

No simulation values, legal rules, seeded identity or outcome logic changed. South Fork and this seed are measurement inputs, not universal world defaults.

## Checks and method

The exact handoff head and all named prompts were read. Preflight passed after explicit network access and workspace-local storage registration with unchanged limits. One checkout was created; no Mac copy or extra project tree exists.

Machine: 8469eb03ed6a. Node: v24.19.0. Starting load: 0.17/0.16/0.06.

The handoff script is exactly 473 bytes, SHA-256 `1a6c077c37d1e25ec8904c861e8573b23478ef79ccc5f5fb1a3c0aea1011d23a`.

Executed: lazy-copy changed test file, 6/6 PASS; final changed test file, 7/7 PASS; scoped ESLint, Prettier and whitespace PASS; zero-dice PASS with 217 allowances. One simultaneous test admission was refused before execution because the month held its reservation; its log is preserved. The test ran after the month finished and passed. No focused check was queued. Scoped TypeScript passed for two changed roots with zero changed-file diagnostics. The initial key annotation error was repaired; runtime code was unchanged by that annotation. Final report checks passed with zero errors and warnings. Release checks passed over origin/main..HEAD in PR mode. Full suite, annual speed simulation and prose reviewer NOT RUN under the current rules and helper limit.

Raw outputs remain ignored and preserved under `test-results/speed/`. No profile, full receipt or original source evidence was deleted. Receipt hashes:

| Raw artifact                          |   Bytes | SHA-256                                                          |
| ------------------------------------- | ------: | ---------------------------------------------------------------- |
| current-main-month.cpuprofile         | 3787364 | 7e58d46ca03b1962a77a8b092fa42c576c6da7f2f4a00d8d48bb5491df26c7bd |
| cloud-before.json                     | 8501135 | 4997f2f8f0d28795813d10e231eb0ea910a16f9979c706e68f55217a7472cc5a |
| cloud-lazy-after.json                 | 8501135 | 1e49425a709c1522b999d1e33df33b0d9d76f669ee0aac0949c1346b3c08d516 |
| cloud-copy-after.json                 | 8501129 | c83ab3ea5d7c2b8bc1d3f98d0d3d2fdf22432332cad6c5962894392113366520 |
| cloud-copy-after.json.comparison.json |      57 | a8a59c56f958d3ff48c6f06049b45af87b5b53977f0c7defae69d1dc81af5f2d |

Commands used the unchanged guard, with `OCD_STORAGE_STATE_DIR=/workspace/.ocd-dev` and `OCD_WORKSPACE_OWNER=TEAM4` for registry location and ownership. No capacity limit override was used.

The exact profile and month commands are in the pinned continuation handback. The output files are named in the receipt table above.
