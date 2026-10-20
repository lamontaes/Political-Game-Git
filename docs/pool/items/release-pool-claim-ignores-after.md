---
id: release-pool-claim-ignores-after
title: "pool claim lets a session claim an item whose after: items are not done"
area: release
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/fs11vb-pca
pr: #5276
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T13:31:03.988Z
---

**What.** The pool index already lists items with unfinished after prerequisites as gated work. The claim command nevertheless accepted those items, so a worker could begin a downstream change while its required input was still in review or blocked. Make claim enforce the same prerequisite statuses as Next up before it changes the item or pushes a claim.

**Rules.** Replace, never layer: enforce the existing after prerequisites in the current claim command, using the same statuses the generated index reads rather than a separate dependency queue. The pool remains the only backlog, and the refusal identifies every unfinished prerequisite.

**Done when.** The claims-and-gates test in scripts/pool/index.test.ts proves an unfinished after prerequisite makes claim refuse with the waiting item named, ordinary claims still work, and a completed prerequisite makes the downstream item appear in Next up. The changed pool tooling passes typecheck, lint, formatting and the release check.

**Files.** scripts/pool/index.ts, scripts/pool/index.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5276 (branch claude/pool-claim-after): merge conflict with main in scripts/pool/index.test.ts (code); finish on that branch, merge main into it first.
