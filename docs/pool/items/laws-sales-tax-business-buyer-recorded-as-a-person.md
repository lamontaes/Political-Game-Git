---
id: laws-sales-tax-business-buyer-recorded-as-a-person
title: "A business that buys from a taxed seller is recorded as a person the sales tax reached, over its own row as a seller"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "effects thread, Nov 16, 2026, measuring the sales tax base change"
model: opus
effort: medium
root: none
---

**What.** When a business buys from a seller the sales tax reaches, the purchase tax records the business as a person the tax reached. The law's reach then keeps one row per target and law, so that buyer row and the business's own row as a seller are the same row, and the last write sets whether it reads as a person or a business. In North Hyde Park, Vermont (place 5050725), seed sales-tax-base, on Train head ef70819622, the three restaurants and three stores sold $38,289 in 60 days and the reach showed none of them among the businesses that paid the sales tax, because each had bought from the town's wholesaler and its row read as a person. Seen: dev mode's reach of a sales tax law (who the law reached), on the bill card.

**Cause.** Found in code: `noteSale` in src/core2/modules/purchase-tax.ts marks every buyer of a sale `target: "person"` unless the sale is counted, with no check that the buyer is an organization; and `lawApplied` in src/core2/law-reach/applied.ts keys its row by law key and target id only (`applied|key|targetId`), not by what was done, so a business that both sells and buys under one tax keeps one row whose `target` and `what` follow the latest write.

**Fix.** `noteSale` marks a buyer that is an organization `target: "organization"`. Whether a seller's and buyer's amounts under one law belong on one row or two is for the laws lead to rule from the reach reader (`lawReach`), which sums them today.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: every business on a sales tax law's reach is named by its own record as buyer or seller, never a person who is not one.

**Done when.** A second session in a drawn place (named, with its seed) passes a sales tax raise in dev mode, runs a month, and sees on the bill card's reach the town's stores and restaurants among the businesses, none of them counted among the people.

**Waits on.** Nothing.

**Files.** src/core2/modules/purchase-tax.ts, src/core2/law-reach/applied.ts

**Notes.** Effects thread, Nov 16, 2026. With the sales tax base (laws-sales-tax-base-by-seller-kind) the wholesaler's sales to stores are no longer taxed, so this shows less often, but any business buying from a taxed seller (a restaurant from a store) still hits it.
