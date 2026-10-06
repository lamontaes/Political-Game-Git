# Session 48 — LW-01 government operations

Status: draft implementation against an explicit local admission stub. This is not production runtime acceptance; Session20 owns manifest/catalog admission and will reconcile the stub.

## Owned files

- `src/simulation/law-consequence-types.ts`: adds the `government-operations` kind literal.
- `src/simulation/law-consequences/government-operations-rows.ts`: the three government-operations law rows.
- `src/simulation/law-consequences/modules/government-operations/index.ts`: typed selectors, resolver, permission writer, dated event, and law-exposure writer.
- `src/simulation/law-consequences/modules/government-operations.test.ts`: new-game tests with a local registry/catalog admission stub.
- `docs/release/changes/government-operations-law-permissions.md`: the repository-native release declaration for the permission/effect behavior.

The shared generated manifest and policy-pack admission registry are intentionally untouched; Session20 is their sole writer. The test's `includeGovernmentOperationsRows` and explicit registration are temporary local test wiring only.

## Evidence and limits

The focused test creates seeded new games, applies the supported resident voting rules to actual household and location records, and verifies saved permissions, source stamps, event-backed exposure, and serialization round trips. It also records the boundary for lobbying: the tested fresh game has no ended legislative or executive employment record, so no former official is fabricated and no lobbying cause chain is claimed. The duration of a post-office restriction is not represented in the source law answer; the current permission records a restriction without inventing a duration.

The outstanding production boundary is Session20's real manifest/catalog registration. The outstanding design boundary is how the former-official lobbying rule should be applied when its source answer has no duration and no former officeholder exists in the random new game. Until those are resolved, the tests establish the module's supported resident-rule behavior under a named stub, not the complete production three-law runtime.

## Checks

Focused result from the implementation owner: `src/simulation/law-consequences/modules/government-operations.test.ts` — 2 tests passed. Prettier and `git diff --check` passed on the owned source/test files and release declaration. A full `npm run typecheck` completed on the current composition; it reports only two existing missing `personalLifeDepiction` fields in `src/simulation/press/press-premise.test.ts` (lines 35 and 125), with no LW-01 diagnostic. Re-run after that fixture owner lands its fix and after Session20 admission is composed.
