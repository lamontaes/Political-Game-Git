---
id: release-audit-12-vacuous-loop-tests
title: "Assert rows exist before looping in the flow and row tests (#5016, #5033, #5008, #5020)"
area: release
kind: bug
priority: 3
size: M
status: claimed
claimed-by: claude/political-game-pool-76ksvw
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:32:36.887Z
---

**What.** Add an assertion that the flows or rows exist before each loop that passes when there are none.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** tests touched by #5016, #5033, #5008 and #5020

**Notes.** Item 12 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

**Result (Oct 20).** Added a nonempty assertion before the loop in utility-staff-paid.test.ts (wage flows), campaign-consulting-firm.test.ts (wage flows), law-reach-group-a.test.ts (hires) and official-pay-death.test.ts (officials; the pinned draw still names the official who died). The first, second and fourth files pass (4 tests, drawn places); law-reach-group-a.test.ts was not run in this session (its edit sits inside a branch that already asserts the hires grew).
