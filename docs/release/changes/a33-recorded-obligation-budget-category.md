---
id: a33-recorded-obligation-budget-category
impact: patch
section: Fixed
title: Preserve categories on paid public obligations
---

Recorded public-program payments now preserve an exact canonical budget category before interpreting older descriptive program keys. Paid pension contributions and interest remain in their own categories instead of being counted as other programs; authority and unpaid commitments still create no settled expense.
