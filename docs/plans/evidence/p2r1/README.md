# P2R1 evidence

Source/test commit: `c0c1757a285143c3b1ee09f47f6d00602a93a26b`. The enclosing evidence commit changes documentation and generated inventory only.
Rejected/start head: `dd9ac1f79a301d71c128a03aab6bac555f21fc0c`.
Publication main: `1b0603ca61f454ad2e8b9412b4869ae6d38e2b6f`.
Accepted Skill merge: `9d14f040c395787819c5971a0fc5985f42a95305`.

- [Owner review](../../active/p2-owner-review.md) states acceptance limits and failures.
- [All text corrections](changes.md) gives current/repaired wording, actual context and originating choice, with separate findings.
- [Full scope ledger](full-scope-ledger.json) contains all 427 rows, including unchanged text and withheld authored reference.
- `rows/001.json` through `rows/133.json` preserve raw writer output, final candidate, exact independent reviewer input/reply and earlier rejected rounds. Parent editorial revisions are distinguished from raw writer output. Separate read-only CLI sessions loaded the accepted role contracts; no role or Skill files were changed.
- [Role checks](role-checks.json): 133 independent semantic PASS results; 127 clean deterministic checks, six recorded surface-drift flags caused by `memo` within the surface name `memory`. They were not suppressed. Semantic PASS does not certify readability or runtime eligibility.
- [Counterexamples](counterexamples.json) and eight compressed canonical Worlds in `snapshots/` reproduce the pre-offer cases. Predicate source is retained, but the household helper now checks active accessible work owned/assigned to the player; the legacy helper was weaker. Old predicates and exact option writes also appear in the full ledger.
- [Missing records](missing-records.md): all 33 withheld families and the specific premise needed.
- [Callback origins](callback-origin-matrix.json): 102 adult options, 13 conversation intents and 33 explicit missing-detail cases. These are provenance cases, not a claim that every option schedules a return. The 137 callback tests exercise schedulable families, historical readback and cancellation; null-aftermath options remain represented in the matrix.
- [Boundary proof](boundaries.json): all 35 family keys, 102 option keys, non-prose option effects, and 405 anchor identities preserved. No allocation or retirement; accepted allocator/CLI unchanged. `anchor-rebinds.log` retains each one-at-a-time accepted rebind.
- [Rejected-head diff](diff-from-rejected.json), [publication-main diff](diff-from-publication-main.json), and [scoped metrics](scoped-metrics.json) keep the two comparisons separate.
- `rejected-old-seeds.json` and `repaired-old-seeds.json` preserve the same seeded sequences, answers, scene keys and text. No new seed was substituted to hide lost reachability. Inventory classification is not proof of runtime demonstration.
- [Accepted Skill parity](accepted-skill-parity.json) verifies bytes against merged #121.
- `logs/` contains red reproduction, final tests and supporting validation. Red logs are chronological: the care fixture was subsequently tightened to a relative with no care record. `full-validation-with-ports.log` precedes the final cancellation test; `final-full-tests.log` is the final 3,104-test result. Initial permission-only failures are not counted as defects in the final report.
- `screenshots/` contains the inspected before/after pointer and keyboard proof. The shared presence caption and visible layout remain outside this repair's acceptance.

## Reproduction

Run from the PR checkout with its normal dependencies:

```sh
npm run test -- src/presentation/p2r1-grounding.test.ts src/presentation/p2r1-action-memory.test.ts src/simulation/p2r1-callbacks.test.ts --maxWorkers=2
npm run test
npm run corpus:prose -- check
npm run prose:eval -- probes
npm run prose:eval -- hygiene
PLAYWRIGHT_PORT=4197 npm run test:e2e -- tests/e2e/p2r1-editorial.spec.ts --workers=1
npm run source:validate
npm run source:replay
npm run build
npm run demo -- validation-seed
npm run validate:art
npm run inventory:art
npm run qa:art
```

Local HTTP tests/browser proof require permission to bind a localhost port. Full validation is **not green**; preserve the reported failures when reproducing. There are no lowered breadth assertions, new skips, increased browser timeouts or reseeded coverage fixtures in this repair.
