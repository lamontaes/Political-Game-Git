---
id: a17-shared-obligation-allocation
impact: patch
section: Fixed
title: Pension budget allocations use the shared amount evaluator
---

Opening and newly adopted budgets evaluate the same saved annual obligation and minimum contribution share through the shared amount evaluator. A full-contribution law preserves larger measured allocations. Sourced opening pension observations and actual cash settlement remain intact; the retired pension-only module no longer computes payments.

Recorded public-program payments now preserve an exact canonical budget category before interpreting older descriptive program keys. Paid pension contributions and interest remain in their own categories instead of being counted as other programs; authority and unpaid commitments still create no settled expense.
