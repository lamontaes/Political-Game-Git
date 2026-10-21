---
id: release-audit-05-journal-lines-not-shippable
title: "Set the nine hand-written journal lines not shippable and require the partners-met and parent-job lines (#5226)"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5507
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Set the nine lines marked origin authored and shippable true to not shippable until the English engine grades them. The test must require the partners-met and parent-job lines in addition to the roots case. It must fail when a required subject is absent, instead of passing on the roots line alone.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2, tests

**Notes.** Item 5 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

Sent back 2026-10-21 from PR #5507 (branch claude/audit-05-journal-lines): The date/audit-comment cleanup is present and the release declaration correctly discloses the nine lines being held. src/director/journal-household.test.ts:80 also raises the timeout from 300,000 to 900,000 ms, but neither the test nor the body gives measured timings that justify that increase. Keep the drawn, nonempty three-kind assertions; record measured build/compose timings that support a bounded timeout, or retain the old timeout. The linked item also requires its audit report line marked fixed with this PR number; docs/reports/merge-audit-2026-10-20.md:25 is still unmarked and the diff does not update it. No local gates are claimed for this source review.; finish on that branch, merge main into it first.
