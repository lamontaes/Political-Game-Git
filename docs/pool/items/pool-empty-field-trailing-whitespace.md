---
id: pool-empty-field-trailing-whitespace
title: "Pool commands insert trailing whitespace when adding an empty metadata field"
area: release
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** While reopening world-gun-sale-flow during PR #5102 review, the pool status command inserted a missing empty claimed-at field as claimed-at followed by a colon and trailing space. Prettier then rejects the generated item. Existing empty keys are trimmed, but the insertion branch of setFields in scripts/pool/index.ts does not trim its inserted value.

**Rules.** Replace, never layer: fix the existing setFields insertion path so pool-generated metadata is formatted without a separate repair step. Local gate: the command output must pass Prettier.

**Done when.** A regression starts with a valid item missing claimed-at, changes its status to open through the pool command, and confirms the resulting item has no trailing whitespace and passes Prettier; the pool command still regenerates its index and preserves all item Notes.

**Files.** scripts/pool/index.ts, scripts/pool/index.test.ts

**Notes.** TODO
