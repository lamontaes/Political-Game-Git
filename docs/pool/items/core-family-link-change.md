---
id: core-family-link-change
title: "A core call adds and ends a partner link between two people, and the births engine reads the couples that result"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by:
pr: #4961
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4961 (branch claude/family-link-change): Morning check: this stack inherits household-change.test.ts from #4948, where if (third) and if (lone) silently omit the split-household and ended-lease cases. Merge the corrected Core prerequisite first so all three required operations are exercised, then merge main here and validate the remaining family-link diff. Also record People-area agreement for the renewal.ts reader change, or have that owning area land it through its own PR.; finish on that branch, merge main into it first.
