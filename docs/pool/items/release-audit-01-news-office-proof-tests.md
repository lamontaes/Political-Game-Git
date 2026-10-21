---
id: release-audit-01-news-office-proof-tests
title: "Make news.test.ts and office-proof.test.ts assert instead of returning early (#4968)"
area: release
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/fs11vb-audit-01
pr: #5509
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:19:41.038Z
---

**What.** Draw places with bounded retries until one has a county and a state office, assert the feature, and fail on exhaustion; keep the no-county case as its own test; put the governor test timeout back near 240,000 ms or state why.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2/news.test.ts, src/core2/office-proof.test.ts

**Notes.** Item 1 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
