---
id: world-opening-other-costs-hold-taxes-paid-again
title: "Opening businesses budget their taxes twice"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: none
source: "layoffs-read-law-costs thread, Nov 16"
claimed-at:
---

**What.** An opening business sizes its non-wage costs from its industry's IRS margin, which is net income after taxes and licenses are deducted. Its suppliers then bill that whole share, and the employer's payroll taxes, premises tax and compliance duties are paid again on top from its cash. Every business opens a few points below its industry's real margin.
Seen: in Center, North Dakota (seed lay-3813180) the town's businesses paid $467,561 in payroll taxes in year one beside suppliers billed the full other-cost share.

**Cause.** Found in code: projectOpeningBusiness in src/core2/business-books.ts (line 234) sets annualOtherCostsMinor to demand times one less the margin, less planned pay, and the outside-costs flow in src/core2/modules/residents.ts (line 1199) bills that share of receipts with no allowance for the charges business-charges.ts records.

**Fix.** At the opening, take the year's expected charges under the laws in force on day 0 (employerTaxShareOfWage, premisesTaxMinor, the compliance and energy year readers) out of the share the outside-costs flow bills, so a law passed in play adds cost above the opening and a repeal takes it away. Seen on dev mode's Why for a business: the month's bill.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every opening business's books carry its taxes once, through the payer engines.

**Done when.** A second session plays a year in a drawn place from all 56 with a seed it chose and sees, on dev mode's Why for three businesses, that the month's weighed costs over sales match the industry's IRS margin within its spread, and that year-one closings and jobs stay within the same place's run before the change.

**Waits on.** The layoffs-read-law-costs pull request (business-charges.ts and the trading row's charges).

**Files.** src/core2/business-books.ts, src/core2/modules/residents.ts

**Notes.** Measured on the layoffs PR at Center ND, Sioux Center IA and Choteau MT, twice a side: counting these charges in the staffing decision changed year-one jobs by at most 12 (Sioux Center, 1,956 to 1,944) and closings not at all, so this is calibration, not a flood of closings.
