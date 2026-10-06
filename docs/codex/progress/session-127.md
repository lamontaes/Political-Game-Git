# Session 127: Native coverage records the remaining art gaps

The coverage test resolves every staged outfit cell through the real pack and
records the missing native poses and views in a shrink-only allow-list. New
gaps fail. Entries that become covered must be removed. This records art debt;
it does not approve pixels or establish installed runtime behavior.

## Resume state

Current item: b24-p7. Branch: codex/session127-b24-p7.
Starting main: c779549bb09b2a6f37379ba601a365f4343affe1.
The [claim](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6021914888)
records the test and allow-list writer boundary. No pack, staging, tag, or shared
place-reader file is changed.

The [test](../../../src/presentation/art-coverage.test.ts#L1) reuses the landed
native demand grid and builder outfit tags. Production posedPieces must return
the requested pose and view, with a compatible slot kind and every garment mask.
Native PNG files must decode at the manifest's dimensions. Unsupported lean and
back requests remain uncovered. PEOPLE_PACK_ROOT can select an existing supplied
pack; the source manifest identity is recorded rather than replaced or enlarged.

The initial measured grid contains 19,305 cells. Native resolution covers 7,908;
11,397 remain uncovered across 528 place/spot groups. The current test checks 814 native PNG inputs, including every declared face
and hair id in each required view. The allow-list was seeded once from those actual failures. Seed mode
refuses to overwrite an existing list. The stronger decoded-input check passes all four tests at 17:50:25 UTC.
No allow-list entry changed when decoding and complete head-id checks were added.

Four tests passed at 17:43:13 UTC after handling Git's exact first-seed message
for a file absent from main. The fixture checks prove a new uncovered spot fails,
a newly covered entry fails until removed, and list growth fails even if the
new failure is added to it. The real check compares entries with fetched main,
rejects duplicate ids and mismatched place/spot provenance, and prints remaining
count. Full list entries retain place/spot groups and hashes of each exact cell.
An empty list is valid when coverage is complete.

Initial sources remain the existing art/people-engine/v1/manifest.json
(SHA-256 f16e4bac13b605a8171425864e4899480f5a225a1f39ecb9305590919483382b),
art/backdrops/staging.json
(26286a64f78a6b93db63b81a7a8067795ad1a85bca25624264d1304df878e903),
and build-people-pack.ts
(4b1d771f92b84684c6c73d0fd45c0f4420593d81432e140a6f7dc01eef0322a9).
These are source identities, not pixel acceptance. Complete turned source
inputs remain unavailable; their cells stay on the explicit allow-list.

## Earlier work and protected boundaries

Native demand [PR #2749](https://github.com/lamontaes/Political-Game-Git/pull/2749)
merged producer 4716c962448a690d3e9af19781b07706868b46d3 into main
9cfa3dcd8505235f20999841c2522f8e5627e5a5. Its source-hashed report lists
19,305 outfit and 186 head cells, with 11,397 and 124 missing respectively.

Venue audit [PR #2751](https://github.com/lamontaes/Political-Game-Git/pull/2751)
remains draft at 7f91b6b3530c015822f653d41b592bf891d2f0f5. Fresh checks there
pass eight tests and retain one wiring failure: 0 of 117 explicit painted-place
keys resolve. The audit has 15 exact painted targets, five unresolved keys,
and 15 dynamic expressions. Zero missing in the known subset is not complete
venue coverage. The shared place-reader and tag-data question remains pending;
these files were not taken over.

The b24-p6 dependency audit records absent art/tags.json and missing backdrop
kind/use/region/climate data in the
[board receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6021874599).
No nearest-place result or tag is guessed. Hair has landed under its authorized
empty-turned-input assertion. Collar stays READY for CTO review with all eight
missing-native failures retained. Rim, cuff, tag and slot audits remain drafts.

## Next action and checks

Decoded-input coverage passes four tests; strict changed-test compilation,
ESLint, and forced full-file Prettier checks pass.
Receive actual current main before publication and preserve this candidate.
Publish the cohesive coverage PR, then run changed-file lint, formatter and tests
at the exact head. The
[new CTO check](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6022003401)
also requires npm run typecheck before READY. Distinguish own errors from unrelated
baseline failures; do not repair another owner's note or simulation writer.
Record exact receipts on the board. Queue work is paused by the owner handoff request.
Logs: /tmp/session127-art-coverage-decoded-test.log and
/tmp/session127-art-coverage-typecheck.log.

## Fast handoff — stopped, no new work

Owner requested a natural handoff on 2026-10-06. Workspace is /workspace/game,
branch codex/session127-b24-p7. Candidate commit before this marker update is
89465e408141026667b133f7a858a2a05c7d169b; original parent is
c779549bb09b2a6f37379ba601a365f4343affe1. Last received origin/main is
ba560daef25b91fd3791f009adf046809f3e8392. All four candidate files are
committed; no dirty or untracked work remains. Publication will remain draft;
its exact remote head and PR receipt are recorded on issue #2424. No command
or CI handle is left running by this session.

Final executed coverage test: four PASS at 17:50:25 UTC, 814 decoded native
PNG inputs, 19,305 cells, 7,908 covered, 11,397 explicitly allow-listed gaps.
Log: /tmp/session127-art-coverage-final-test.log. Focused strict changed-test
compilation, ESLint and forced full-file Prettier passed. Full npm run typecheck
has not run for this candidate; there is no READY or exact published-head check
claim. Artifact art/coverage/allow-list.json is 924,794 bytes, SHA-256
e7f2a56ff0c9164e8d0296f56971bed246068003c29bf420d61dd80a694f17b3.
Native turned input gaps remain failures in the seed; no art was generated.
Shared place/tag writers remain protected; draft #2751 still has its 0/117
resolver failure. Existing draft audits and earlier source identities above
remain recovery evidence. No source bank, mask, reader or tag owner takeover.

Exact next action after resuming: inspect git status and this board receipt,
receive current origin/main without discarding work, reconcile actual conflicts,
then run npm run typecheck and the scoped coverage checks at the resulting
head before considering READY. Do not reseed or grow the allow-list.
