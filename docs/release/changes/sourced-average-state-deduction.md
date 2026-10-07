---
id: sourced-average-state-deduction
impact: patch
section: Fixed
title: Unread state tax deductions use their sourced average
---

State tax deductions absent from the acquired table use the plain average of
the read deductions for their tax structure. The world seed no longer changes
that estimate or the withholding from the same paycheck. Read deductions and
tax brackets keep their acquired values.
