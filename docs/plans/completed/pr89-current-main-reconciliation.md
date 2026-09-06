# PR #89 Current-Main Reconciliation

Status: completed

## Objective

Merge live `main` into the existing
`claude/garment-morphology-fit-profiles` branch without rebasing or rewriting
history, while preserving the repaired fail-closed garment-fit contract.

## Grounded heads

- Starting PR head: `d563b2853982af50251651563850e51129264d17`
- Live main at start: `48e217cce3929abc1f8c848c70743f5af2a53b0f`
- Common base: `68d7d48ee09aa7ea1a13a2d152f4f1129669ade5`

## Reconciliation

1. Read the Drive 76A measurement authority and the complete PR history at
   `8cc72e3`, `5e6f713`, and `d563b28`.
2. Merge `origin/main` normally and resolve only the files Git identifies as
   conflicted.
3. Preserve the projection-boundary warp refusal, closed finite bounds,
   measured-only classification, per-side residual, production-bank warp ban,
   source raster bytes, and frozen generation signatures.
4. Run the fit derivation twice and compare the complete generated outputs
   byte for byte.
5. Run all required art inventories and QA, the asset-bank inventory, full
   validation, relevant browser proof, and whitespace validation.
6. Re-fetch `main`, verify the reconciled branch still contains its head, push
   without force, and record exact-head CI.

## Stop conditions

- Do not merge PR #89.
- Do not start S3.
- Do not touch PR #90.

## Result

- Merged live main normally; no rebase and no history rewrite.
- Git reported three conflicts. The generated inventory was regenerated from
  the combined tree, the decision-log collision was resolved by appending the
  garment decisions as D-078/D-079 with explicit reconciliation notes, and the
  ownership-boundary test kept current main's accepted wording for the same
  already-closed range.
- No runtime garment-fit file conflicted. The repaired projection refusal,
  bounds checks, measurement statuses, per-side residual, and production warp
  ban remain byte-identical to the starting PR head.
- PR #90 was not touched, PR #89 was not merged, and S3 was not started.

## Verification

- `npm run derive:garment-fit` twice: byte-identical bank
  `57af69546b4c02dc12275d1975e3f8d0645270db6baa68797a06eb72dbfc15e9`
  and report
  `433c5f144a07e7e68c4af4e67a0a5c391940c04146002b41944c4e7368d2f00f`.
- `npm run measure:references`: byte-identical 76A output
  `2b68c6197044618553e7b4bb3d175b5c7d7075d0e2e341feb161446ff7808338`.
- `npm run inventory:art`: 329 items.
- `npm run qa:art`: passed and regenerated the contact sheet and QA report.
- `npm run inventory:asset-bank`: 8 released environment plates, 9 released
  component kinds, 28 masters, 6 pose families, 4 queued generations.
- Focused garment tests: 127 passed.
- `npm run test:e2e -- tests/e2e/character-proof.spec.ts`: 5 passed.
- The ordinary `npm run validate` was attempted twice under simultaneous
  repository jobs elsewhere on the host; both failures were only unrelated
  five-second test timeouts, with 2,416/2,422 and 2,418/2,422 passing and no
  assertion mismatch. The complete unchanged validation chain then passed
  with only Vitest's per-test timeout widened to 30 seconds: 2,422/2,422 tests,
  source validation, byte-identical source replay, production build,
  deterministic demo, and art validation.

## Learn

- Long-lived append-only branches must check the live decision-log tail before
  integration; identifier collisions are resolved by explicit renumbering
  notes, never by overwriting accepted decisions.
- Generated aggregate inventories are resolved by regeneration from the merged
  tree, not by choosing one side's stale count.
- On a shared host, timeout-only failures should be replayed narrowly before
  changing unrelated code. Exact-head CI remains the final ordinary-timeout
  acceptance gate.
