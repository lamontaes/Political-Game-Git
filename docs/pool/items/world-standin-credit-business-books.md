---
id: world-standin-credit-business-books
title: "Credit and business stand-ins: ownerless borrowers, opening owners, compliance cost, deposit buffer"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-standins-other (Oct 19, 2026); rows SG-WORLD-business-opening-owners, SG-WORLD-business-compliance-cost, SG-P8-business-books-classification, SG-WORLD-deposit-wallet-buffer, SG-WORLD-opening-mortgage-funding (SG-WORLD-credit-business-applies and SG-WORLD-macro-mortgage-spread are resolved on main)
---

**What.** Two rows of the original split are already resolved on main and are not part of this item: SG-WORLD-credit-business-applies and SG-WORLD-macro-mortgage-spread (the mortgage rate after 2019 comes from FHFA's MIRS Transition Index, ESTIMATED, and the Freddie Mac exclusion stands: OWNER-DECISIONS.md, "Mortgage rate after 2019" and "The Freddie Mac survey exclusion"). What remains: ownerless opening businesses (SG-WORLD-business-opening-owners), compliance duties costing a flat multiple of average abatement (SG-WORLD-business-compliance-cost, to become per-industry abatement cost from Census PACE), the business books classification (SG-P8-business-books-classification), the deposit wallet buffer (SG-WORLD-deposit-wallet-buffer; the owner ruled the 27-day buffer only checks totals and an unfunded obligation goes to arrears while the owner chooses to put in cash, borrow, cut or close: OWNER-DECISIONS.md, "Business shortfalls") and the opening mortgage funding (SG-WORLD-opening-mortgage-funding). Whether a firm holds a credit line comes from the credit engine reading its books and owner (OWNER-DECISIONS.md, "Credit lines").

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A played year in a drawn place, started with buildBenchWorld, shows the replacement read by another engine by record id, a test in a random place of all 56 names the place and seed, and each remaining row (SG-WORLD-business-opening-owners, SG-WORLD-business-compliance-cost, SG-P8-business-books-classification, SG-WORLD-deposit-wallet-buffer, SG-WORLD-opening-mortgage-funding) is resolved in src/core2/data/stopgaps.json with the reason.

**Files.** src/core2/modules/credit.ts, src/core2/modules/business.ts, src/core2/macro-model.ts

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).
