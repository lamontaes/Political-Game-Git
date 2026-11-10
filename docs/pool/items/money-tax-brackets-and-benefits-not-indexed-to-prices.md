---
id: money-tax-brackets-and-benefits-not-indexed-to-prices
title: "Income tax brackets, the standard deduction and the Social Security wage base never rise with prices: over decades every worker drifts into the top bracket and the federal ledger piles up a surplus"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: money
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
---

**What.** The paycheck rule (withholdingFor in src/core2/tax-withholding.ts) reads each schedule's brackets, standard deduction and wage base as fixed dollar amounts from the law row in force. Pay rises with prices year after year and the amounts never move. Measured in the country tier's forty-year run on Nov 10 (scratch harness, the central bank's own view, no law changed): average hourly pay went from about 35 dollars to about 155, and the federal ledger, balanced on day one, ended about 74 trillion dollars in surplus, which is tax taken by brackets that stood still. Real federal brackets, the standard deduction and the wage base are indexed each year by statute, and most states index theirs. The same rule taxes a town paycheck, so a long played game has the same drift.

**Rules.** One model, two tiers: the fix is one change in the shared rule so the town and every state's cells get it alike. Simulate it, don't ask (owner, Oct 24): indexing is a mechanic real law has, built from research with no question to the owner. The law decides, not a typed number: whether a schedule is indexed, and to what, is read from the law row's terms.

**Done when.** A test in src/core2/tax-withholding.test.ts shows that a schedule whose law row says it is indexed takes the same share of a paycheck after prices and pay both double, and one that says it is not takes more. In a played world on main in a drawn place with a seed nobody chose, a second session runs twenty years in dev mode and reads the federal ledger on the Metrics tab: its yearly balance as a share of what the country sells stays within a few points of where it opened unless a law changed.

**Files.** src/core2/tax-withholding.ts, src/core2/tax-withholding.test.ts, src/core2/data/laws/starting-law.json, src/core2/country-law.ts, src/core2/country-model.ts

**Notes.** Which states index their brackets is a research question for the starting law (kind research may be split out). Retirement income and other aid in the tier already keep up with prices.
