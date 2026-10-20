---
id: art-seated-desks
title: "Seated people at public desks are clipped at the shoulders (#3295)"
area: art
kind: bug
priority: 2
status: claimed
claimed-by: session52/art4-seated-desks
pr: #3295
blocked-on:
milestone:
source: "open PR #3295"
claimed-at: 2026-10-20T00:37:22.402Z
---

**What.** Nine deficient bounds in the seated-desk staging are corrected on the PR branch. The art staging file and the backdrop anchor render test conflict with main, so the branch needs a plain merge of main before the CTO can merge it. Resolve the conflicts in the staging data and the render test, keep the nine corrected bounds, and put the gate line at the top of the PR body.

**Rules.** Replace, never layer: the corrected bounds replace the deficient ones in the staging data, and no second copy is left beside them. Merge main into the PR branch with a plain merge, never a force push, and add a release declaration in docs/release/changes/.

**Done when.** The PR branch merges main cleanly, the backdrop anchor render test in src/presentation/backdrop-anchors-render.test.ts passes, the nine corrected bounds are in art/backdrops/staging.json, and the PR body opens with a gate line naming the checks run on the changed files.

**Files.** art/backdrops/staging.json, src/presentation/backdrop-anchors-render.test.ts, docs/release/changes/

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #3295 (branch session52/art4-seated-desks): merging main conflicts in art/backdrops/staging.json, docs/codex/assignments/POOL.md, src/presentation/backdrop-anchors-render.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #3295 (branch session52/art4-seated-desks): Sent back by the merger: merging main conflicts in art/backdrops/staging.json, docs/codex/assignments/POOL.md, src/presentation/backdrop-anchors-render.test.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.
PR #3295 closed unmerged (2026-10-16); reopened by the pool reconcile Oct 19.
