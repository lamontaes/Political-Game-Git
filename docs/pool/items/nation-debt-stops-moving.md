---
id: nation-debt-stops-moving
title: "Find why the Treasury stops borrowing, and keep the federal debt by year"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry
blocked-on:
lead: laws
model: opus
effort: high
root: none
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** In the six-year game the federal debt was $36.54 trillion at the end of 2029 and the same to the cent at the end of 2030, with nothing borrowed in December 2030, and the Treasury paid about one dollar in six of its Social Security line that month. Federal payments prorated that hard cut the state's aid, then its collections, then the next year's spending. This is a find-the-cause item first, measured in the played world, then a fix in the owning engine. Seen: Metrics' federal debt and the state's spending the next year.

**Cause.** Found in code: `borrowFederal` (src/core2/budgets-treasury.ts:975) borrows nothing once the debt-limit question is yes or the lender pays short, and the month's payments are prorated (line 1394). Inferred, not yet measured: which of the two stopped it.

**Fix.** Take the measurement first: read the law row for the debt-limit question in 2029 and 2030, any law-applied rows saying borrowing was held to the limit, and the U.S. monthly treasury rows' borrowing through 2029 (the question opens as no from the real law, so a bill would have to pass in play; or the outside account lent less than asked, line 1024). Fix the measured cause in its engine. The budgets engine writes the debt, borrowing and deficit to the nation's December row. This is a different defect from the open item keeping debt holders' balances exact past very large numbers (core-long-run-federal-debt-rows-past-safe-integer).

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: the stop is named by the law or the lender's record that held it, not assumed. No dice: borrowing follows the law in force and the lender's payment, never a chance. One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete.

**Done when.** A second session plays three years in a drawn place, naming the place and seed, and the debt moves each year or the law that held it is named in dev mode.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
