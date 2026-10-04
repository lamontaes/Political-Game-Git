---
id: office-payroll-period-index
impact: none
---

Office payroll reads the maximum recorded period start per pay flow through the
existing growing history index. Completed, partial, blocked and other saved
outcome statuses retain the same period-closing behavior. The existing opening
salary initializer prepares salary-flow and period-summary reads before play,
without advancing time or writing future payments or law effects. Dated office
eligibility, amounts, cash assessment and shared settlement remain unchanged.
Source inspection establishes that repeated office reads no longer scan each
flow's entire recorded payment history; no profile or runtime speed claim is made.
