---
id: core-household-membership-change
title: "A full person can join, leave or split off a household in the same town, with its lease, bills and cash following"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by:
pr: #4948
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4948 (branch claude/household-membership): Morning check: the new household-change.test.ts can pass without exercising two of the three API operations: splitting into a new household is inside if (third), and emptying a household/ending its lease is inside if (lone). Require or separately draw eligible worlds for each case with bounded retries, and fail if any case is not exercised. After advancing forty days, rerun the payer/membership invariant as well; it is currently called only before the advance.; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4948 (branch claude/household-membership): Merging current main (6d06ba1622) conflicts in docs/pool/items/core-household-membership-change.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
