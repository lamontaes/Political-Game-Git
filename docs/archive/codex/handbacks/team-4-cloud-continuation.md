# Team 4 — cloud continuation for monthly speed

The local current-main profile could not start because storage admission refused it. Continue on the coordinator-designated cloud machine, keeping before and after measurements on that same machine. No current-main timing or top-five cost result exists. Preserve this local workspace, claims and private evidence until the cloud has a confirmed working checkpoint. No further local profiling, cleanup or storage override is authorized.

## Source and ownership

The verified implementation baseline is main at `4a2be71b13f5361ebedb4d49d63c0ce4deddb35f`. This handoff changes documentation only. Recheck the destination's main before the next run; record its actual SHA rather than silently attributing a later source to this baseline. The local registered workspace is `/private/tmp/wt-gate-1125`.

GitHub verified speed PR 1145 merged at `5bdf4de09ee092d85c34ea1096566a134dc403df`, and lazy-copy PR 1151 merged at `a6ad6cf497ed008e3bbccbd51a476a244ec51489`. The coordinator retains assignment authority; Claude approves exact heads and the designated cloud Merge session merges. Team 4 does not merge. Existing scope is the four released history helpers and state-intake batching; Group D remains deferred. Do not add helpers or broaden ownership.

## First cloud profile

Seed: `b18-f375512c`. Place: South Fork, `4272168`. Advance exactly thirty days through the ordinary observer route. Use normal shared load unless the coordinator grants a bounded pause; do not independently stop jobs. Record machine identity, source SHA, Node version, load and exact command.

Create the ignored measurement file `test-results/speed/profile-month.ts` with this exact existing local script; it is 473 bytes with SHA-256 `1a6c077c37d1e25ec8904c861e8573b23478ef79ccc5f5fb1a3c0aea1011d23a`:

<!-- prettier-ignore -->
```ts
import { performance } from 'node:perf_hooks';
import { advanceObservedWorld } from '../../src/presentation/observer-world';
import { openWatchedWorld } from '../../scripts/dev-lab/world-aging';
const world = openWatchedWorld('b18-f375512c', '4272168').world;
const started = performance.now();
const next = advanceObservedWorld(world, 30);
console.log(JSON.stringify({ seconds: (performance.now() - started) / 1000, from: world.currentDate, through: next.currentDate }));
```

Run from the source root:

```sh
npm run storage -- run test -- node --max-old-space-size=4096 --cpu-prof --cpu-prof-dir=test-results/speed --cpu-prof-name=current-main-month.cpuprofile --import tsx test-results/speed/profile-month.ts
node scripts/speed-years/profile.mjs test-results/speed/current-main-month.cpuprofile
```

The profiler measures simulation before serialization; the recorded start and end must span all thirty days. Report the five largest self frames in seconds, with file/function names. Label garbage collection as a runtime frame. Separately report current self and aggregate costs for createCharacterHistoryContextPeople, recordsForId, pastCandidatesBySeat and affiliationIndexes; an absent old function name is not proof its replacement has no cost. Select one measured bounded fix after this profile.

## Same-machine equality and speed proof

Use the tracked month tool for a fresh cloud baseline before a further speed edit:

```sh
npm run storage -- run test -- node --max-old-space-size=4096 --import tsx scripts/speed-years/month.ts --out test-results/speed/cloud-before.json
```

After a bounded fix on the same machine:

```sh
npm run storage -- run test -- node --max-old-space-size=4096 --import tsx scripts/speed-years/month.ts --out test-results/speed/cloud-after.json --before test-results/speed/cloud-before.json --limit 15
```

The tool compares complete people in order, decisions and events, excludes only recorded history positions and reports every changed decision sequence/cutoff. Disclose full-world fingerprint differences. Ship a faster validated piece as a ready PR when the world matches; the overall target remains under fifteen seconds. Run focused changed tests and scoped types, not the full suite. A failed limit is not a semantic failure; disclose both independently.

## Local evidence and limits

These are private local references, not cloud inputs or files to add to Git. No large output was copied into this handoff.

| Evidence path under `/private/tmp/wt-gate-1125/test-results/speed/` |   Bytes | SHA-256                                                          |
| ------------------------------------------------------------------- | ------: | ---------------------------------------------------------------- |
| baseline-month.json                                                 | 8502852 | 3e3c37c9cbdb18f00dd21130e7b727fbf181ac5eb9a7c7a6ed7cf86ab3429285 |
| candidate-month.json                                                | 8502855 | 56d5685ebb9e9e0e86ae61cc534fad9746b56fdc84b86d652846d96af8b42ed8 |
| candidate-month.json.comparison.json                                |  713572 | 3deba7911f8b9c7eea25295dd2cd763fd782629797c8fa18fdf4ad969c932768 |
| month-ready-helpers.cpuprofile                                      | 2821209 | 3ebc29bf55e1039e23d32b1a78d01659dbcf8ebe0ac388ec2ec28ed77a277815 |

Historical local baseline: 131.788 seconds; speed candidate: 107.994 seconds, with resumed concurrent load. This is not an exclusive-load comparison or cloud timing. All 15,024 people, 9,227 decisions and 20,049 events matched after excluding recorded history positions. Exactly 2,883 decision positions changed. Full-world fingerprints differed. The fifteen-second limit failed. The later lazy-copy fix has focused regression proof but no follow-up month timing.

The later local profile at speed source `c20e411636b9a4879fd7e767cd48e3b4151604ff` took 255.771 seconds under shared load. Its largest self frame was createCharacterHistoryContextPeople at 43.015 seconds across all calls, not only existing-only copying. It predates the merged lazy-copy fix and is not current-main evidence. Summary: `/private/tmp/team4-month-ready-summary.txt`. The state opening/turnover integration was interrupted and produced NO RESULT; its log is `/private/tmp/team4-state-batch-integration.log`.

## Current-main storage refusal

The attempted main profile exited 3 before simulation. The guard required 1.0 GiB with zero usable above the 25 GiB reserve, and requested 1.4 GiB more free space. Log: `/private/tmp/team4-current-main-month-4a2be71b1.log`. No profile file, current timing, top-five costs or equality result was produced. The BLOCKED receipt and inventory were posted in coordinator Doc 00 and verified by native readback before the requested deadline.

Supported inventory found no Team 4 registered disposable roots or live reservations. Its two unregistered typecheck run directories total 656 KiB, with no receipt ownership or recorded disposition, so neither is eligible for automatic retirement. Their exact inventory is `/private/tmp/team4-storage-blocked-inventory.json`, with an empty eligible-retirement manifest. All baseline/profile evidence remains preserved. The coordinator accepted this receipt and stopped local capacity investigation.

Cloud destination and machine identity are pending coordinator setup. No cloud working checkpoint, new timing, new top-five list or further code fix is claimed. Do not retire the local workspace or release claims before that checkpoint is confirmed.
