---
id: a60-surviving-town-opening-books
impact: patch
section: Fixed
title: Open health business books through surviving town finance writers
---

The surviving town-finance module accepts recorded staff quarter-pay to open
business books at the start of a game. Clinics and care homes use the same
existing industry calculation as other town businesses. Their opening sales
advance and later quarterly receipts use canonical resource transfers with
stable employer/date keys. Existing government, customer and player payments
count toward sales rather than adding a second credit.

The town's existing aggregate customer constructor has one shared home; its
current local-business consumers retain their identity and behavior. A tracked
customer balance still caps payment. The adapter does not create employer cash
accounts or estimate unsupported pay periods; the owning payroll caller supplies
its recorded pay and cash setup before calling it.
