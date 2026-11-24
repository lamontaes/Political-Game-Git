---
id: world-standin-credit-business-books
title: "Credit and business stand-ins: ownerless borrowers, opening owners, compliance cost, deposit buffer"
area: world
kind: stopgap
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on: world-standin-credit-business-books-part-1-opening-owners, world-standin-credit-business-books-part-2-compliance-cost, world-standin-credit-business-books-part-3-books-classification
lead: money
model: sonnet
effort: low
root: none
source: split from gov-standins-other (Oct 19, 2026); rows SG-WORLD-business-opening-owners, SG-WORLD-business-compliance-cost, SG-P8-business-books-classification, SG-WORLD-deposit-wallet-buffer, SG-WORLD-opening-mortgage-funding (SG-WORLD-credit-business-applies and SG-WORLD-macro-mortgage-spread are resolved on main)
checked: fable 2026-11-10
---

**What.** Two rows of the original split are already resolved on main and are not part of this item: SG-WORLD-credit-business-applies and SG-WORLD-macro-mortgage-spread (the mortgage rate after 2019 comes from FHFA's MIRS Transition Index, ESTIMATED, and the Freddie Mac exclusion stands: OWNER-DECISIONS.md, "Mortgage rate after 2019" and "The Freddie Mac survey exclusion"). Two more rows are owned by other items: the deposit wallet buffer (SG-WORLD-deposit-wallet-buffer, world-stopgap-credit-deposits-faked-mechanic) and the opening mortgage funding (SG-WORLD-opening-mortgage-funding, world-stopgap-credit-missing-record). What remains here are three business rows: ownerless opening businesses (SG-WORLD-business-opening-owners), compliance duties costing a flat multiple of average abatement (SG-WORLD-business-compliance-cost, to become per-industry abatement cost from Census PACE) and the business books classification (SG-P8-business-books-classification). Whether a firm holds a credit line comes from the credit engine reading its books and owner (OWNER-DECISIONS.md, "Credit lines"). It is built in three parts, one per row.

**Cause.** Found in code: SG-WORLD-business-opening-owners and SG-WORLD-business-compliance-cost (src/core2/data/stopgaps/world.json) and SG-P8-business-books-classification (src/core2/data/stopgaps/p8.json) are open; they are marked in `open` (src/core2/modules/business.ts line 240, the highest-paid worker becomes owner-operator), `routeCompliance` (line 1020, a flat multiple of the manufacturing abatement share) and src/core2/data/business-books.json (line 259, the authored classification crosswalk).

**Fix.** Replace the three business rows each with its engine read, in three parts: opening owners, compliance cost per industry, and books classification. The two credit rows are dropped from this item because their own items own them.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** An effect is a read, not a record: the replacement counts only when another engine reads what it writes at the moment it decides or pays. No dice: traits, law and money decide, never a roll. Replace, never layer: each stand-in is deleted in the same change that replaces it.

**Done when.** A second session, on main in a drawn place from all 56 (place and seed named), plays a year in dev mode and finds each opening business with an owner record, a compliance cost sourced by industry, and a classified book, each read by the credit engine or the business books by record id. The three rows SG-WORLD-business-opening-owners, SG-WORLD-business-compliance-cost and SG-P8-business-books-classification are resolved with the reason in the stopgap files, and the three parts are merged.

**Waits on.** The three parts: world-standin-credit-business-books-part-1-opening-owners, world-standin-credit-business-books-part-2-compliance-cost, world-standin-credit-business-books-part-3-books-classification.

**Files.** src/core2/modules/credit.ts, src/core2/modules/business.ts, src/core2/macro-model.ts, src/core2/data/business-books.json, src/core2/data/business/parameters.json, src/core2/data/stopgaps/world.json, src/core2/data/stopgaps/p8.json

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given opening businesses owners and per-industry compliance cost and classified books; no player sees any of them.
