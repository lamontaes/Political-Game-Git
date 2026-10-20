---
id: outside-account-authority-breaks-budgets-test
title: "budgets-public-pay.test counts every organization with a public pay authority as a government employer, so it fails once a place's outside account carries one (#5577)"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/budgets-test-outside-authority
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:43:12.004Z
---

**What.** src/core2/budgets-public-pay.test.ts filters organizations by publicPayAuthority and expects a treasury link for each. PR #5577 gives each place's outside account an authority; the outside account has no treasury, so the test's first expectation fails. In my own build of the same item (unpushed) the fix was to skip organizations of kind outside-market in that filter.

**Rules.** No new behavior; the test should still prove every government employer's wages come out of its treasury.

**Done when.** budgets-public-pay.test.ts passes in a drawn place with the outside account carrying its authority, and still fails if a government employer's authority has no treasury link.

**Files.** src/core2/budgets-public-pay.test.ts

**Notes.** Found Oct 20 (claude) while building core-outside-pay-authority in parallel with the session that opened #5577. Check whether #5577 already changed this test before building.
