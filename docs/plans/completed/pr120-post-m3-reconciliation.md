# PR120 post-M3 mechanical reconciliation

## Scope

Ordinary-merge live main `25b7e7a291e22374566c30d31552dcc4d8314d51`
into the same PR120 branch at accepted head
`b8e5b1107287e6367dc6e0114d03b726c4858962`. Leave PR120 unmerged.
No I1A/I1B rerun or municipal semantic change is authorized or needed.

## Workspace and plan

- Preflight ran in `/private/tmp/pg-pr120-post-m3` before reconciliation.
- The original checkout and prior `/private/tmp/pg-i1b-pr120` remain untouched.
  The same branch is also registered there; it is a paused, read-only checkout.
  The explicit same-branch requirement is implemented in this fresh worktree.
- Preserve both appended audit sections; retain mechanically merged source docs.
- Regenerate MANIFEST from the combined domain registry and replay all sources.
- Compare accepted municipal Git blobs and canonical main ownership-test blob.
- Run focused municipal/source/ownership tests, full validation, all art gates,
  diff checks, then push after a fresh remote comparison.
- Require CI validation and browser proofs on the final published head.

## Acceptance

Existing municipal acceptance is preserved. Mechanical reconciliation is complete;
readiness remains contingent on final-head verification reported separately.

## Mechanical proof

All five municipal implementation files, the Kentucky fixture, the municipal
suite, the acceptance-test document, and both accepted municipal plans retain
exact Git blob identity with accepted head `b8e5b1107287e6367dc6e0114d03b726c4858962`.
The accepted audit and source-system documents survive as exact byte prefixes;
only main's civil-service additions follow them. The regenerated manifest equals
canonical main plus the exact accepted municipal production-gate entry.
The judicial ownership test is byte-identical to post-M3 main.
Every other imported file comes directly from main; no additional generated or
shared artifact required conflict resolution. Clean source replay verifies all
tracked generated source artifacts against authoritative compilation.

## Verification and compatibility

- Focused municipal: 33 passed; all ownership suites: 23 passed (56 total).
- Source validation: 13 compiled domains, zero errors; replay byte-identical.
- Full repository validation passed format, lint, and typecheck; the default
  test phase encountered timeouts in unchanged suites during concurrent machine
  load. Final test outcomes and any controlled rerun are reported separately.
- Art inventory: 322 items, already current. Art QA is running in a disposable
  copy so its generated outputs cannot alter the accepted branch.
- Published-head CI validation/browser proof is required before readiness and
  will be reported with exact SHA and run links in the completion response.
- Architecture compatibility: confirmed by unchanged feature blobs and scoped
  merge diff. No simulation, player, provenance, schema, or stage contract changes
  originate in this reconciliation. The two accepted audit sections are retained.

## LEARN

At an append-only documentation conflict, keep both accepted domain sections.
For a generated manifest, rebuild from the combined registry and prove that its
only PR-specific difference is the preserved accepted gate. Blob comparison
establishes preservation without reopening substantive feature acceptance.
