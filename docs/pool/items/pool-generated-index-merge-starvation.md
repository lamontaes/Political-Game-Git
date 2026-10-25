---
id: pool-generated-index-merge-starvation
title: "Generated pool index conflicts repeatedly prevent checked planning PRs from merging"
area: release
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Planning PRs add or refine valid pool items and regenerate the shared INDEX, but ordinary pool status updates on main change that same generated file during the local gate. Four planning PRs have repeatedly passed their own checks and then received a pinned merge conflict. The shared generated artifact prevents the reviewed specifications from landing even when their item data remains compatible, so the merge path needs a root fix rather than repeated manual reconciliation.

**Rules.** Replace, never layer: retain one canonical generated index and preserve every pool item and its Notes. Never hand-merge INDEX or weaken pool validation to hide stale output. Keep ordinary pushes, independently checked PR heads and concurrent claim ownership safe.

**Done when.** An integration test reproduces concurrent pool status edits and a planning PR adding child items, then demonstrates both can land through ordinary merges with no lost Notes, claims or specifications; regenerating INDEX exactly matches tracked main after each operation, without force pushes or a relaxed checker.

**Files.** scripts/pool/index.ts, docs/pool/INDEX.md, .github/workflows/pool-done-on-merge.yml, docs/pool/README.md

**Notes.** Merger 3 observed repeated local-green then pinned-merge-405 cycles on #5035, #5075, #5079 and #5155. Latest #5035 checked head c39b746aa8914b837d71c153aff8d6e0e1b80fe4 passed typecheck, format, zero-dice and release; 31 pool errors matched main, own quality clean and completion parser null. Main changed the shared index during the gate. Existing PR comments and parent Notes retain earlier checked heads.
