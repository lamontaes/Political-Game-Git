---
id: tests-early-returns-residents-retirees
title: "Four residents tests end early in a place without a retiree or a zero-day payday"
area: core
kind: cleanup
priority: 3
size: S
status: in-pr
claimed-by: claude/tests-early-returns-residents-retirees
pr: #5037
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:35:51.388Z
---

**What.** Generated-world tests can pass without checking their claim when their opening lacks a retiree, an earlier payday, an eligible campaign or another required record. PR #5037 replaces eleven such early returns with bounded searches for an eligible opening or assertions proving the negative case. Its residents test conflicts with current main, so integrate the existing branch with a normal merge and preserve both sets of assertions. Finish this repair on that branch rather than starting a duplicate implementation.

**Rules.** One rule, all 56 places: draw the fixture from actual place and resident records, name the place and seed, and never special-case a state to avoid a failure. No dice: eligibility comes from the records needed by the test, not from whether the output already passes. Preserve all behavior assertions; protected Words files require a Words-owned change.

**Done when.** In a played world drawn from all 56 places, each repaired test exercises its positive case or proves the absence from actual records, with place and seed printed. A bounded search fails explicitly on exhaustion, the residents conflict is resolved without dropping assertions, and changed-file checks pass.

**Files.** src/core2/residents.test.ts, src/core2/campaign-day.test.ts, src/core2/leadership.test.ts, docs/release/changes/tests-early-returns-residents-retirees.md

**Notes.** TODO

Sent back 2026-10-20 from PR #5037 (branch claude/residents-test-draws): Merge main 974dd83da259 into claude/residents-test-draws conflicts in: src/core2/residents.test.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.
