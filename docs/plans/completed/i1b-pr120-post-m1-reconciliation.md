# I1B PR120 post-M1 reconciliation

## Scope and authority

Execute Drive handoff `1k1mdPtsKmDJtCukP10y3K2g5IMGMTKiDddDp6oe0gHc`.
Preserve accepted feature head `aedb5908a62b5006fdd17b646af629873acf9097`.
Ordinary-merge current main into the same PR branch; no feature expansion,
semantic changes, rebase, force push, or PR merge.

## Progress

- Preflight passed in isolated `/private/tmp/pg-i1b-pr120`; source workspace untouched.
- PR118 merged as `a93b8f9da2b76d69123abc6b37b4b196f9d0d5db`.
- Ordinary merge is conflict-free and changes only the canonical ownership test.
- All 12 accepted PR120 feature/shared blobs remain byte-identical, including
  MANIFEST and municipal documentation. No source regeneration is required.
- Ownership test matches current main exactly.
- Focused tests passed: 33 municipal and five canonical ownership cases.
- Local `npm run validate` passed format, lint, and typecheck; its test phase
  hit five 5-second timeouts in unchanged art/stress/source cases under concurrent
  machine load (2,381 passed). No assertion or municipal failure occurred.
- Controlled full rerun passed 2,386/2,386 using two workers and a 30-second
  test timeout. Source validate/replay, build, deterministic demo, art validation,
  and 322-item art inventory passed. Standard CI settings remain unchanged.
- Exact published-head GitHub validation/browser results and final remote state
  are reported in the task completion response; acceptance requires those gates.
- The implementation/reconciliation plan is complete; PR merge remains excluded.

## LEARN

For inherited ownership-test failures, consume the canonical main repair and
compare Git blobs before expanding an already accepted feature audit. This
reconciliation needs no new municipal audit because every accepted blob is exact.

## Final-main refresh

The first reconciled head `ad34c21300661fcfa725fb798a6c85c79463137a` passed
both GitHub runs: 2,386 semantic tests and 249 browser proofs in each.
The final fetch then found M2/PR113 merged to main as
`414b24ce6120799985d3b0bddbf196c9c064df36`. An ordinary conflict-free merge
imports those 12 main-owned files unchanged. All 12 accepted PR120 blobs and
the canonical ownership test remain exact. No manifest regeneration or
municipal-governance semantic change is needed. The final head must receive
fresh exact-head CI/browser proof; prior-head results do not substitute.

## M2 PR114 refresh

Head `c7a42a49e6b97ab065ec288985920020566fdc3a` passed both CI runs with
2,425 tests and 249 browser proofs each. Final fetch found PR114 on main at
`1a91101ab4f5369aeec21c6e9f32c21114794c81`. Ordinary merge preserved the
new fiscal domain. MANIFEST merged mechanically; source documentation kept
the exact accepted municipal gate paragraph and appended main's fiscal and
other-domain gate explanations, omitting its stale five-domain count. All
other accepted PR120 blobs remain exact. Fresh CI is required on this head.
