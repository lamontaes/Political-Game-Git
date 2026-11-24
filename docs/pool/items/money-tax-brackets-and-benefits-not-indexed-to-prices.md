---
id: money-tax-brackets-and-benefits-not-indexed-to-prices
title: "Income tax brackets, the standard deduction and the Social Security wage base never rise with prices: over decades every worker drifts into the top bracket and the federal ledger piles up a surplus"
area: world
kind: bug
priority: 2
size: M
status: merged
standard: 2
claimed-by: claude/pool-money-tax-brackets-and-benefits-not-indexed-to-prices
pr: #8694
blocked-on:
lead: money
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
after:
model: opus
effort: medium
root: rc5-full-detail-every-day
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:19:05.479Z
branch: claude/pool-money-tax-brackets-and-benefits-not-indexed-to-prices
merged-at: 2026-11-12T21:51:21.479Z
---

**What.** The paycheck rule (withholdingFor in src/core2/tax-withholding.ts) reads each schedule's brackets, standard deduction and wage base as fixed dollar amounts from the law row in force. Pay rises with prices year after year and the amounts never move. Measured in the country tier's forty-year run on Nov 10 (scratch harness, the central bank's own view, no law changed): average hourly pay went from about 35 dollars to about 155, and the federal ledger, balanced on day one, ended about 74 trillion dollars in surplus, which is tax taken by brackets that stood still. Real federal brackets, the standard deduction and the wage base are indexed each year by statute, and most states index theirs. The same rule taxes a town paycheck, so a long played game has the same drift. Seen: the federal budget and the paycheck over decades, where every worker drifts into the top bracket and the ledger piles up a surplus of about 74 trillion dollars.

**Cause.** Found in code: `withholdingFor` in src/core2/tax-withholding.ts (line 112) walks each schedule's brackets, standard deduction and wage base as fixed dollar amounts from the law row, with no index (the bracket loop is at line 79). Measured evidence: the country tier's forty-year run of Nov 10 (scratch harness, no law changed) took average hourly pay from about 35 to about 155 dollars and left the federal ledger about 74 trillion dollars in surplus.

**Fix.** Index brackets, standard deduction and wage base per the law row's terms; research which states index.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: the fix is one change in the shared rule so the town and every state's cells get it alike. Simulate it, don't ask (owner, Oct 24): indexing is a mechanic real law has, built from research with no question to the owner. The law decides, not a typed number: whether a schedule is indexed, and to what, is read from the law row's terms.

**Done when.** A test in src/core2/tax-withholding.test.ts shows a schedule whose law row says it is indexed takes the same share of a paycheck after prices and pay both double, and one that says it is not takes more. A second session, not the builder, plays twenty years in dev mode in a drawn place on a seed nobody chose and reads the federal ledger on the Metrics tab: its yearly balance as a share of what the country sells does not climb year after year unless a law changed.

**Waits on.** Nothing.

**Files.** src/core2/tax-withholding.ts, src/core2/tax-withholding.test.ts, src/core2/data/laws/starting-law.json, src/core2/country-law.ts, src/core2/country-model.ts

**Notes.** Which states index their brackets is a research question for the starting law (kind research may be split out). Retirement income and other aid in the tier already keep up with prices.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:18 UTC) on branch claude/pool-money-tax-brackets-and-benefits-not-indexed-to-prices.
