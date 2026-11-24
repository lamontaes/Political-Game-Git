# 127R — post-126 mechanical landing repair

Authority: user-directed 127R packet, following accepted 127A substantive audit.

- Existing branch: `claude/r3j-legislative-power-2hi7qn`.
- Starting head: `81c7d58c072fd8b5acced0b1e2d5c4ca732dd371`.
- Main to merge: `b61abf26118e50be351c09db5b3d0823333fc9ec`.
- Owned isolated workspace: `/private/tmp/political-game-127r`.
- Original detached workspace remains read-only, including its modified evidence images.

## Work

1. Merge current main normally; stop on substantive source or rule conflict.
2. Regenerate the combined prose corpus and pin actual scanner measurements.
3. Preserve accepted R3J evidence, source notes, rules and tests; verify the exact 36-node partition.
4. Run focused checks, corpus check, full validation, art inventory/QA and diff check.
5. Re-fetch both heads, commit and push to the same PR; leave open and unmerged.
6. Record exact-head checks and the narrow acceptance state.

No research, schema, prose rewrite, UI, gameplay or semantic redesign is authorized.

## Measured reconciliation

The normal merge produced one conflict, in `scripts/prose-corpus/corpus.test.ts`.
No source, evidence, rule-pack or other substantive conflict occurred.
The combined tree was measured directly using `buildProseInventory()` and
`buildCoverageReport()`, then regenerated with `npm run corpus:prose`.

- Total literals: 48,138; INVENTORIED matches: 1,899; scanned files: 314.
- Inventory: 1,869 templates; digest `1a2cbe537950d862` (unchanged from P1 main).
- Coverage: 4,512 intentionally non-player-facing; 3,217 diagnostic/test;
  2,786 needing classification.
- Diagnostics: zero hard errors; 310 existing review warnings.
- `corpus:prose -- check` passed: seven artifacts byte-identical and the review
  packet identical apart from its recorded generation commit.
- Regeneration changed only coverage report/candidates and the packet's recorded
  generation SHA relative to main. No P1 template, anchor or prose was edited.

## Semantic preservation and architecture check

All seven accepted R3J substantive files (evidence JSON, source documentation,
rule pack and four semantic test files) are byte-identical to `81c7d58`.
The evidence contains exactly 36 unique jurisdiction/node pairs with receipts:
19 already represented, 1 newly compiled, 11 with no exact schema consumer,
5 without a federal consumer, 0 conflicts. Its SHA-256 remains
`fac6bca6b469c50668528a8fc68bc3b9bc0ac176cfcf6bcd82d631cd92d84f22`.
Kentucky's ten-day post-adjournment window and in-session becomes-law outcome,
Alaska's scoped distinctions, Illinois's unflattened amendatory-veto fact, and
all source/excerpt hashes remain intact. No no-op reclassification was needed.

The architecture checklist introduces no new rule or exception: the repair only
reconciles a generated measurement. Domain ownership, source provenance, history,
headless boundaries, jurisdiction semantics and deterministic behavior are unchanged.
The five focused legislative/projection/corpus files passed all 153 tests.

## LEARN

The existing live-measurement assertion and corpus check are the appropriate
regression mechanisms. Generated count conflicts require a combined-tree scan;
retain that explanation beside the pin instead of adding a new process layer.

## Landing verification

Art inventory and QA generation completed successfully without tracked art changes.
Implementation and regeneration are complete. The merge commit is the candidate
for exact-head full validation and publication; its final command results and CI
snapshot are reported in the 127R return. PR #127 must remain open and unmerged
pending narrow landing acceptance.
