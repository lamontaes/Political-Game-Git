---
id: world-stopgap-finance-estimated-mechanism
title: "Stopgaps in finance (estimated-mechanism): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/finance.json, kind estimated-mechanism"
after:
---

**What.** The settlement rules in src/core2/data/finance.json and src/core2/finance-state.ts close a business immediately after one recorded obligation that cash and finite credit cannot fund (the reason `finance.unfunded-obligation-cash-and-credit-exhausted`). Real firms do not: JPMorgan Chase Institute data show a median of 27 days of cash buffer (interquartile range 13 to 62), and an owner reacts. Replace the immediate closure with an insolvency path: an obligation that cannot be paid becomes arrears owed to that creditor (wages first, by the wage-claim priority in law), the owner decides each month from their own cash, traits and the firm's books whether to put in their own money, draw credit, cut hours, or close (an act chosen with recorded reasons, as `credit.ts` does), and a firm is closed by its creditors only when arrears have run past the period the law allows before an involuntary petition. Households' unfunded standing bills already become arrears on contracts that accrue them, which the housing and credit engines read; leave those, and narrow the row's text to what remains (household purchase choices belong to world-stopgap-opening-finance-authored-opening-counterparty-crosswalk, and supplier terms to world-stopgap-finance-state-receipt-budget-proxy).

**Rules.** No dice: whether an owner puts in cash, borrows, cuts or closes follows their cash, traits and the firm's books, and the 27-day buffer is a real rate that checks the share of firms that fail, never a firm's fate. Sliding scales and causes: a deeper shortfall and a longer arrear raise the pull to close a little at a time, with no day on which it flips. One rule, all 56 places: the wage-claim priority and the petition period are law rows per jurisdiction. An effect is a read, not a record: the credit engine, the jobs engine (layoffs) and the owner's acts must read the arrears and the closure. Ask why: each closure names the arrears record and the owner's recorded reasons. One model, two tiers: a counted-owner business follows the same path. Money is pressure, not a score: a failing business shows in the owner's life.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a business with a shortfall gets arrears records instead of closing the same day, its owner is shown by act record id to put in cash, borrow, cut or close with reasons, a firm that closes does so after its arrears and its owner's choice by closure record id, laid-off workers appear in the jobs engine, the share of firms that close in the year stays within the Census business-exit rate spread, the cash journal balances, and src/core2/finance-insolvency.test.ts proves it; the row text in stopgaps.json is narrowed or resolved.

**Files.** src/core2/data/finance.json, src/core2/finance-state.ts, src/core2/modules/business.ts, src/core2/modules/credit.ts, src/core2/modules/jobs.ts, src/core2/finance-insolvency.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Monthly standing household budgets, modeled within-day work pay before household purchases, conservative finite recorded credit, interest accounting and immediate closure after an actual unfunded obligation when cash and

Oct 20 (pool feeder): spec written; research for the buffer is in data/research/stopgaps-oct19/B-people-behavior-2.json (JPMC 27 days, IQR 13 to 62; household 30-day late period is an estimate). Household side not split out: world-housing-counted-rent-arrears and world-fill-in-arrears-from-household already carry arrears for households. Related ruling: money is time, freedom and pressure (OWNER-DECISIONS.md, Oct 20). Needs core-closures calibration to stay near the Census exit rate (world-census-scale-closures-rise).
