# V89B post-audit reconciliation

Status: reconciliation completed; exact-head CI and V89C are separate gates

Accepted head: `a48f495da77fa5c6de830c38a3aa3de183962555`.
Initial live main/M1: `a93b8f9da2b76d69123abc6b37b4b196f9d0d5db`.

Ordinarily merge current main into the accepted history in an isolated takeover
worktree, then push normally to PR #89's existing branch. Preserve accepted fit
blobs, current-main ownership checks and decision authorities. PR #101 is open;
retain garment D-078/D-079 unless live main changes that authority before push.
No PR #90 changes, S3 work, new art or fit semantics.

Verify fit derivation twice, 76A regeneration, source/fit blob identity, focused
fit and ownership tests, relevant browser proofs, full validation and all three
art gates. Re-fetch immediately before publication and reconcile any new main
through another ordinary merge. Require exact-head CI; leave PR #89 open for V89C.

## Reconciliation evidence

The ordinary merge of M1 applied without conflicts. The Packet 26 ownership test
and its support helper already match main byte for byte. No resolution edit is
needed. Current main's decision log is an exact prefix of the combined log;
D-078/D-079 remain the accepted garment decisions.

All 32 accepted PR-owned files were compared against the accepted head. Only
`package.json` differs, retaining main's `readiness:art` command. All
fit source, fixture rasters, fit bank/report, catalog-related changes and garment
documentation remain byte-identical. The 76A source directories are unchanged.

- Fit bank SHA-256: `57af69546b4c02dc12275d1975e3f8d0645270db6baa68797a06eb72dbfc15e9`.
- Fit report SHA-256: `433c5f144a07e7e68c4af4e67a0a5c391940c04146002b41944c4e7368d2f00f`.
- 76A measurement SHA-256: `2b68c6197044618553e7b4bb3d175b5c7d7075d0e2e341feb161446ff7808338`.
- Two fit derivations and the 76A regeneration match the accepted bytes.
- Focused fit plus ownership suites: 140/140 passed across seven files.
- Character proof and real-character browser suites: 7/7 passed.

Architecture integrity disposition: confirmed compatible. This reconciliation
introduces no new rule or feature; main's accepted systems remain unchanged,
and the accepted fit projection, closed bounds and refusal behavior are retained.
Human visual acceptance is not inferred from these automated proofs; V89C is
still required.

## Learn

Compare shared ownership checks against live main before resolving them: an
already-identical file needs no patch. Prove preservation using blob identity,
and keep generated aggregate outputs unchanged when regeneration confirms them.

## Files imported from main

- `AGENTS.md`
- `art/qa/asset_readiness.json`
- `art/qa/asset_readiness.md`
- `art/requests/asset-requests.json`
- `art/requests/preserved-asset-reconciliation.json`
- `docs/plans/active/executive-governing-current-mechanics-wave.md`
- `docs/systems/art-assets.md`
- `docs/systems/executive-governing-workflow-kernels.md`
- `package.json`
- `scripts/art-asset-factory/asset-readiness-inputs.ts`
- `scripts/art-asset-factory/cli-asset-readiness.ts`
- `src/authoring/asset-readiness.ts`
- `src/simulation/executive-governing-kernel-bank.ts`
- `src/simulation/executive-governing-kernels.test.ts`
- `src/simulation/executive-governing-kernels.ts`
- `tests/asset-readiness.test.ts`
- `tests/executive-governing-ownership-boundary.test.ts`

## Validation status at publication

All three art gates passed; inventory remains 329 items and QA regenerated with
no tracked byte changes. Formatting, lint, typecheck, source validation/replay,
build and deterministic demo passed. The ordinary full validation invocation
reached 2,471/2,480 passing tests, with eight five-second timeouts and one
launcher assertion affected by a concurrent fixed-port collision (5196). A
single-worker rerun with unchanged time limits is also being recorded externally;
it encountered a corpus-digest timeout on the shared host. No test or product
code was changed to hide these environmental failures. Exact-head GitHub CI is
the remaining normal-command gate and must pass before V89C readiness is claimed.

The final reconciliation report will identify the immutable merge SHA and CI run.
PR #89 remains open; V89A acceptance is preserved, V89C acceptance remains pending.

## Local rerun result

The single-worker suite passed 2,479/2,480 tests; its only failure was the
unchanged five-second corpus-digest timeout. The isolated digest test then passed
with its normal timeout (2.67 seconds). All original failures therefore passed
on unchanged code. The complete normal command remains delegated to exact-head CI.

Ordinary merge commit: `0c093657615483d3b0ceb42623b8b271106ca9fc`.
Parents, in order: accepted `a48f495da77fa5c6de830c38a3aa3de183962555` and
main/M1 `a93b8f9da2b76d69123abc6b37b4b196f9d0d5db`. The final documentation
commit only closes this plan; its exact-head CI is reported in the handoff.
