---
id: core-stopgap-work-cash-estimated-modeled-public-pay-obligation-bridge
title: "Stopgaps in work-cash (estimated-modeled-public-pay-obligation-bridge): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/work-cash.ts, kind estimated-modeled-public-pay-obligation-bridge"
after:
claimed-at: 
---

**What.** Public jobs are paid through a modeled public pay authority: `prepareOpeningPublicPayAuthorities` (src/core2/opening-public-pay.ts) links each opening public employer to a treasury, `api.fundPublicPay` in the budgets module draws its wages from that treasury, and `resolvePublicWorkPayDue` (src/core2/public-work-pay.ts) raises the stopgap on every payment because the authority is not tied to any enacted appropriation, deduction or pension. Tie it to the budget: each government's adopted budget carries a personnel line per department (sized to the Census ASPEP March 2021 payroll of about $4,706 per local employee-month, biweekly by default), the authority records the budget line id it spends under, and a pay due is paid only up to what the line and the treasury allow, with the existing public-pay shortfall record when they fall short. Withholding stays with the income tax engine; add the employee and employer pension contribution as the state's retirement-system law row (rates from the Census of Governments pension survey) paid to the system's account. Remove the modeled flag and the marker when every authority names a budget line.

**Rules.** An effect is a read, not a record: the pay due must read the budget line and the treasury's cash when it pays, and the month's close must read the shortfall. Wire to the world: each public paycheck moves money from a treasury to a person, and the pension share to the retirement system, by journal record id. One rule, all 56 places: line sizes, pay frequency and pension rates come from data per government, never a named place. One model, two tiers: a counted public employee is paid under the same line times their count. Replace, never layer: the modeled-authority path is deleted when the budget line replaces it. Estimate, never UNKNOWN: a government with no ASPEP row takes its size class average, marked ESTIMATED.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a town teacher or clerk is paid every payday under a named budget line record id, the treasury balance falls by the same journal records, a cut to the personnel line by the council's budget lowers the next pay due or records a shortfall, the pension contribution reaches the retirement system's account, and src/core2/public-pay-budget-line.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/opening-public-pay.ts, src/core2/public-work-pay.ts, src/core2/work-cash.ts, src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/public-payroll.ts, src/core2/public-pay-budget-line.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: A proposed source-owned public-payroll bridge would use saved estimated hourly work/pay terms and an explicitly linked modeled paying authority to fund only each genuine current attended-work obligation; it would not cla

Oct 20 (pool feeder): spec written; the treasury link and the shortfall record are already built (api.fundPublicPay, publicPayShortfallMinor); what is missing is the budget line the authority spends under, and deductions and pension. Sizes: data/research/stopgaps-oct19/B-people-behavior-2.json (ASPEP). Overlaps gov-outside-revenue-retire-plug only on the federal side; do not touch its plug.
