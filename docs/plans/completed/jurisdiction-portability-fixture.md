# Domain jurisdiction portability proof

## Authorization and workspace

- Repository: lamontaes/Political-Game-Git.
- Runtime model/reasoning: `gpt-5.6-sol` / `xhigh` (GPT-5.6 Sol / Extra High), confirmed from this task's turn metadata.
- Workspace: `/Users/lamontae/Documents/Political-Game-Jurisdiction-Portability`.
- Branch: `codex/jurisdiction-portability-fixture`.
- Starting accepted main: `72416e493a686b1f44b5c03b9a41e0fe141b13b8`.
- Required ancestor verified: `db3568212e7784045acfcb565fea1d1b2169d7a2`.
- Initial agent preflight: clean, unique branch/worktree, no upstream yet.
- PR #13 inspected at `2f0b4e4cfc9f4f7765c6e7ebd978521ba1139134`; all of its paths are excluded, including shared architecture, acceptance, handoff, and package files.
- The accepted main handoff still describes PR #16 as open. Fetched Git history proves it merged; that stale handoff is preserved because PR #13 owns it.

## Scope and architecture

Lexington remains the primary future sourced gameplay scenario; its current data remains a placeholder. Add exactly one clearly synthetic domain fixture, not Slice E, national content, law, procedures, elections, campaigns, geographic data, or UI.

The low-level `createWorld` and person-v5/names-v1 foundation already accept arbitrary home jurisdictions. Extract the existing demo assembly into a required-context `createScenarioWorld` seam. Keep backward-compatible default wrappers and all schemas, RNG keys, person identity, materialization, validators, and Stage 6 semantics unchanged. Inject jurisdiction, initial canonical moment, and authored context labels. Keep accepted lexical demo copy only in the primary fixture/compatibility adapter. Use canonical date arithmetic for relative temporary context.

Add Synthetic Tidal Basin, with its own ID, slug, name, synthetic parent, seed, eight generated people, and a late-evening Pacific/Honolulu moment in July. This timezone is test context only, not a claim that the fictional jurisdiction exists in Hawaii or follows any real law. Use current canonical writers and snapshot codecs for replay.

## Steps and evidence

1. Capture accepted-main SHA-256 baselines before editing. Done for default demo, generated demo, completed demo replay, two explicitly seeded demos, and default D-Lite World.
2. Implement required jurisdiction context and one synthetic fixture; extend existing world tests.
3. Prove exact default output, alternate integrity and home/fact references, person-v5/names-v1, seed replay/variation, person-owned appearance, zoned/date progression, invalid references/offsets, and serialized continuation.
4. Run focused tests, full `npm run validate`, existing production/stress person harness plus alternate-context samples, `git diff --check`, and agent preflight. Run all three art gates, with output-producing gates in a disposable copy so protected art paths remain unchanged.
5. Apply the Architecture Integrity Audit checklist here and in a dedicated domain contract document. Perform a small LEARN pass. Do not edit PR #13's shared documents.
6. Re-fetch, recheck remote branch ownership and PR #13 overlap, commit/push normally, open exactly one PR, verify exact-head Actions, and leave it open/unmerged.

## Accepted-main byte baselines

SHA-256 over `serializeWorld(world)`, captured on Node 22.23.2 before edits:

| Scenario                 |  Bytes | SHA-256                                                            |
| ------------------------ | -----: | ------------------------------------------------------------------ |
| Default demo             |  93381 | `9dfc87a0cedc05b376a7eeb48313e27c8ee585736e35ae75da5b2bba6a18175b` |
| Default generated        |  93326 | `e8960aabe5c2045d726e7634956543c0680f860de2c6df4edadfa84680de41ae` |
| Default demo replay      | 102578 | `c6166d95c2ad758c10bbf7d60631381e168568ce32fe780902c345d514a15137` |
| Explicit seed, legacy    |  93393 | `aff805cca9312a09de96ab60bd5c435c6372da49614979cf18b2e94a76a6630f` |
| Explicit seed, generated |  93348 | `0f4a8198520c4d87c3fde126c443d4298c6ddbe5a4fc394c5a4017bf6207aabb` |
| Default D-Lite World     | 127787 | `6de3e4b5d785f84f1aa3f6fa8894aa2c8d11a418cb75d482305b8e92464621a2` |

The explicit seed is `jurisdiction-portability-legacy-proof`.

## Validation status

Implementation and local validation completed on 2026-08-28. Publication and exact-head Actions evidence are reported in the PR and completion report; the PR must remain open/unmerged.

- Focused domain/person/boundary/SQLite suite: **63 tests passed** across five files.
- `npm run validate`: **passed**, including formatting, lint, typecheck, **509 tests** across 32 files, production build, deterministic demo (`reproducible: true`), and art validation.
- `CI=1 npm run test:e2e`: **34 passed** with an independently started server; no existing agent server was reused.
- `npm run stress:persons -- --seeds 100 --per-seed 100 --profile production`: passed, 10,000 people, ages 21–75, 10,000 distinct appearance IDs.
- `npm run stress:persons -- --seeds 100 --per-seed 100 --profile stress`: passed, 10,000 people, ages 18–88, 10,000 distinct appearance IDs.
- Repeated the existing harness through its API with the portability jurisdiction and July date for both profiles: 10,000 people per profile, exact report replay, zero appearance collisions, 207 full-name collisions per profile. Names are not identities; collisions do not merge people.
- Alternate construction stress tests validate 20 full worlds x 8 people for each profile and match every person to the existing harness output.
- All five accepted-primary snapshot baselines and the default D-Lite snapshot baseline matched exactly after extraction.
- Alternate initial snapshot SHA-256: `f8f9caea6af050306c5b34fad661dbd6f38dae13bc96614e8c91e1cfaf73f045`.
- Alternate action replay SHA-256: `26525522f299f08ef934ca51d8ad3c910cce9212a328d43a6bcc3281b91851dc`. Fresh replay and JSON checkpoint continuation are byte-identical through 2026-07-23 00:20 Pacific/Honolulu, UTC-10:00. SQLite continuation also passes.
- `npm run validate:art`, `npm run inventory:art`, and `npm run qa:art`: passed in a disposable copy of this worktree's scripts/package/art; all protected worktree art bytes were hash-checked unchanged. Full validation additionally ran art validation directly in the worktree.
- `git diff --check`: passed.
- Agent preflight was run before work; final clean branch/upstream state is verified again after publication.
- Re-fetch confirmed main remains `72416e493a686b1f44b5c03b9a41e0fe141b13b8` and PR #13 remains at `2f0b4e4cfc9f4f7765c6e7ebd978521ba1139134`. No PR #13 path or protected player/presentation/art path changed.
- Nonblocking existing warnings: locked installation reported one high-severity dependency advisory; build reports a chunk over 500 kB; Node reports experimental SQLite. Dependencies and build configuration were left unchanged.

## Audit and remaining limits

The [domain contract](../../systems/jurisdiction-portability.md) records the Architecture Integrity Audit dispositions, API behavior, backward compatibility, and limits. The core world/people/time/persistence implementations are unchanged. No schema migration or Stage 6/7/8/9 system was added.

This proves one-primary-jurisdiction fixture construction, identity, time context, and replay. It does not prove national civic content or UI portability. Parent remains a descriptive label; names remain the accepted starter corpus. The shared diagnostic scaffold needs at least three people. The accepted seed-based World/person ID namespace is retained, so independent contexts needing independent IDs must use distinct seeds. Runtime IANA timezone support remains an existing dependency.

## LEARN

- Unexpected issue: the low-level world graph was already portable, but demo-local date and narrative literals could still leak primary-scenario context into another world.
- Root cause: constructor arguments covered people IDs but not the complete authored scenario context; the temporary attention end date was fixed to the original January start.
- Durable mechanism: a required typed context for shared assembly, an exact pre-change primary snapshot hash suite, and alternate-world serialized-context/clock/replay tests. The existing stress harness is checked against full alternate worlds in both profiles.
- Process lesson: required inventory/QA commands write protected art outputs. Running them in an isolated disposable copy and comparing worktree art hashes satisfies validation without creating a PR #13 conflict.

## Acceptance state

Ready for repository review, not merged and not a new visual acceptance. No player or visual redesign was performed. The only next authorized delivery action is normal branch publication and one open PR; merging remains prohibited.
