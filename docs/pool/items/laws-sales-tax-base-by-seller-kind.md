---
id: laws-sales-tax-base-by-seller-kind
title: "The sales tax reaches what each state taxes: medical care, tuition, insurance and most services are outside the base"
area: laws
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "owner, Nov 16, 2026, 01:58Z (effects session: laws that reach industries wrongly); plan approved 02:08Z, item 2"
model: opus
effort: medium
root: none
---

**What.** Every sale in town paid the sales tax: a clinic, a nursing home, a private school, an insurance agency, a realtor and a law office remitted on all they took in, though no state taxes medical care or tuition and most tax few services. The treasury's sales tax revenue was therefore too high in towns heavy with services. Seen: dev mode's reach of the sales tax law (who the law reached), which listed the clinic among the businesses that paid it.

**Cause.** Found in code: `syncSalesTax` (src/core2/modules/budgets.ts) gave each government's purchase tax no exemption but the grocery one, so `collect` and `sellerTaxShare` (src/core2/modules/purchase-tax.ts) taxed every seller classification in full. Measured: at Center, North Dakota (place 3813180), seed ilt-3813180, the clinic remitted $106.67 in its first 14 days.

**Fix.** A data file, src/core2/data/laws/sales-tax-base.json, gives the share of each seller classification's sales the tax does not reach (ESTIMATED with spread), with a state's own share where it differs (Hawaii, New Mexico and South Dakota tax most services). `syncSalesTax` passes those as the tax's own exemptions, before the grocery exemption, through the existing purchase tax; no second tax path.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: every share is an ESTIMATED row with its spread. One rule, all 56 places: states differ only in the data. Replace, never layer: the purchase tax's exemptions are the one path.

**Done when.** A second session plays a month in a drawn place in a sales-tax state and sees, in dev mode's reach of the sales tax law in force (who the law reached), that the town's stores and restaurants paid it and its clinic and insurance agency are not among them; in Hawaii, New Mexico or South Dakota a professional office remits too.

**Waits on.** Nothing.

**Files.** src/core2/data/laws/sales-tax-base.json (new), src/core2/modules/budgets.ts, src/core2/sales-tax-base.test.ts (new)

**Notes.** Effects thread, Nov 16, 2026. Values are ESTIMATED from memory of the Federation of Tax Administrators' services survey; the container could not fetch it. A researcher item can turn them SOURCED.
