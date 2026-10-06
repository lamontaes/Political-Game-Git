---
id: comparable-opening-employer-accounts
impact: patch
section: Fixed
title: Open missing employer accounts from recorded comparables
---

At opening, an active paid employer without an existing cash position or
annualizable payroll can use the mean recorded spendable cash of active paid
employers with the same saved classification. Each donor is counted once,
including saved zero balances. Existing positions are preserved.

The opening pass uses the existing comparable-cash reader and canonical account
writer. Its donor snapshot is fixed before admitting estimates, so a newly
estimated account cannot become another estimate's donor in the same pass.
Without a recorded matching cohort, the cash gap remains explicit; no balance
or cash receipt is invented. Save and reload retain the same accounts.
