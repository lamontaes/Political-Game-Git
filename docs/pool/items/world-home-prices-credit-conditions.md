---
id: world-home-prices-credit-conditions
title: "Lenders loosen and tighten: how easily a household gets a mortgage moves the town's buyers and its home price level"
area: world
kind: feature
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr:
after: world-home-prices-from-housing
blocked-on:
lead: money
model: opus
effort: medium
root: none
checked: Account lead T49 2026-11-14
source: Account lead T49 building world-home-prices-from-housing; the coordinator's condition 3 (Nov 14, 2026)
---

**What.** The home price level moves with pay, the 30-year rate and the month's buyers against homes offered. Nothing in the world loosens or tightens lending, so the 2006-2011 fall in home prices can't happen: run on the published months the rule rises 1.5 to 5 percent a year from 2008 to 2012 while FHFA's state indexes fell 2.6 to 5 percent a year (scripts/research/home-price-fit.ts). Seen: Metrics' typical home value through a recession, and how many renters buy.

**Cause.** Measured: `node --import tsx scripts/research/home-price-fit.ts` (June-to-June rule against FHFA's state mean, 2008 to 2012; no place or seed, the published national months). Found in code: `bankYes` (src/core2/modules/credit.ts) weighs a buyer's payment against income, but no lender standard (down payment required, payment-to-income allowed, share of applications approved) moves with the economy, the bank's losses or the foreclosures in town.

**Fix.** Make the town bank's lending standard a kept figure the credit engine moves from its own records (its foreclosure losses, its capital, the economy's unemployment), read by `bankYes` and the down payment `buyHomes` asks. Fewer approved buyers then lower the month's buyers, and the price level falls through the pressure term it already has. Calibrate against the Fed's Senior Loan Officer survey (net share tightening residential mortgage standards).

**Time box.** 6 hours for one Opus session at medium effort.

**Rules.** One engine per mechanic: lending stays in the credit engine. No dice. Real data calibrates the response, never the standard.

**Done when.** A second session runs a drawn place through a simulated recession and sees the bank's standard tighten, fewer renters buy, and the typical home value fall, by record id.

**Waits on.** world-home-prices-from-housing.

**Files.** src/core2/modules/credit.ts, src/core2/modules/housing.ts

**Notes.** Filed by Account lead T49 on its own branch.
