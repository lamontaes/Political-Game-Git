---
id: local-budgets-require-recorded-account-cash
impact: patch
section: Fixed
title: Local budgets settle only from their recorded public account
---

County and city budgets validate their saved public account before reading
payments and cash. A missing, mismatched or ambiguous account leaves the
budget unchanged. A forecast alone no longer settles a local government's
month. Existing state and federal account behavior is preserved.
