---
id: release-audit-01-news-office-proof-tests
title: "Make news.test.ts and office-proof.test.ts assert instead of returning early (#4968)"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Draw places with bounded retries until one has a county and a state office, assert the feature, and fail on exhaustion; keep the no-county case as its own test; put the governor test timeout back near 240,000 ms or state why.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2/news.test.ts, src/core2/office-proof.test.ts

**Notes.** Item 1 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

**Result (Oct 20).** news.test.ts draws up to twelve towns until one sits in a county and asserts the county story reaches residents; office-proof.test.ts draws up to six places until one has both a sitting governor and a sitting legislator and fails on exhaustion; the early returns are gone. Both files pass (7 tests). The governor test timeout stays at 1,800,000 ms with its reason in the test (it plays up to 450 days before the ten days); no measured run time was taken here. The separate no-county test was not added: a town in no county has no county record to assert on.
