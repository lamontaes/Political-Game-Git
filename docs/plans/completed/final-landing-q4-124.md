# FINAL-LANDING-Q4 — PR #124

Authority: user-directed FINAL-LANDING-Q4, Google Doc
`1_5G5uWC8N8qXYplKWYjRV2qlaVr3fQuSBilfJDyFZ20`.

- Existing branch: `codex/src-cap2`; PR #124.
- Start: `1edb4c6cdc27622a2e2bc459e1748847524affd4`.
- Main: `2c6723904556a722f3ea17ea0bf7865272bcca14`.
- Prerequisites: #122 merged at `af8e851e8eafc01f2f02715b0749e1e1585745dd`,
  then #120 at the stated main; ancestry verified.
- Isolated worktree: `/private/tmp/pg-final-q4-124`.
- Preflight passed; prior landing workspaces remain read-only and their writers idle.

Normal-merge current main, preserve municipal fixture/gate and bounded Census
production declarations, regenerate the shared manifest from the combined tree,
prove accepted blob preservation, run focused/full validation and art checks,
then publish to the existing branch and verify exact-head CI. Leave unmerged.
#101 may start only after the owner merges this reconciled #124 onto main.

## Mechanical result and preservation

Exactly two merge conflicts: `data/source/MANIFEST.json` and
`docs/systems/source-substrate.md`. The documentation retains the municipal
fixture section and independent acquisition gate alongside the accepted Census
production declarations. `source:manifest` regenerated 15 compiled domains and
four gated domains; all previously accepted compiled entries survive exactly.
`source:replay` is byte-identical. No raw bytes or domain corpora were replaced.

All 36 original feature paths retain their starting blobs except these two
shared files. The staged merge has no other resolution differing from both
parents. All incoming code, tests, assets, skills and prose aggregates are exact
accepted-main cargo. No semantic source, identity, rights, bounded-scope or gate
change is introduced.

The actual combined corpus check passes without regeneration: 48,662 literals,
1,899 inventoried matches, 316 files, 1,869 templates, semantic digest
`1a2cbe537950d862`, 310 warnings and 2,813 unclassified candidates. The Q3 final
49,332 checkpoint belongs after #101 and #127; it is not a pin for this step.

Architecture/LEARN: this merge adds no rule or exception. Preserve declarations
from both domains, regenerate their shared manifest, then compare each accepted
entry and run replay. Existing manifest/replay and source-boundary tests remain
the durable controls; no new process rule or broader source audit is needed.

## Validation

- Focused source/capability/municipal selection: 235 available tests passed
  across the initial run and unchanged finance-file retry; two existing
  archive-cache recut tests skipped because the caches are absent. One initial
  finance compile test timed out under concurrent load, then passed unchanged.
- Full `npm run validate`: passed formatting, lint, typecheck, 162 test files /
  2,933 tests (two existing cache skips), 15-domain source validation,
  byte-identical replay, production build, deterministic demo and art validation.
- `inventory:art`: current, 329 items. `qa:art`: passed with no tracked art delta.
- Corpus check, staged/working whitespace checks and accepted-blob comparison passed.
- An earlier validation attempt was stopped after the active plan moved during
  formatting; the complete rerun used this final path and passed.

Local mechanical landing is complete. Exact-head CI and the published SHA are
reported in the delivery response. The PR remains unmerged for owner action;
no source acquisition, semantic repair, or human visual acceptance is claimed.
