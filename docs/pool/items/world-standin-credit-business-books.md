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
source: split from gov-standins-other (Oct 19, 2026); rows SG-WORLD-credit-business-applies, SG-WORLD-business-opening-owners, SG-WORLD-business-compliance-cost, SG-P8-business-books-classification, SG-WORLD-deposit-wallet-buffer, SG-WORLD-opening-mortgage-funding, SG-WORLD-macro-mortgage-spread
---

**What.** An ownerless business applies for a credit line whenever cash runs low, compliance duties cost a flat multiple of average abatement, and the macro mortgage spread after 2019 is a mean. Replace these with each organization's own decider choosing to borrow, per-industry abatement cost from Census PACE, and a published monthly mortgage series. The macro-mortgage-spread row cites a CTO ruling excluding Freddie Mac while history.json already cites it, so check the decision register first.

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A played year in a drawn place, started with buildBenchWorld, shows the replacement read by another engine by record id, a test in a random place of all 56 names the place and seed, and each row (SG-WORLD-credit-business-applies, SG-WORLD-business-opening-owners, SG-WORLD-business-compliance-cost, SG-P8-business-books-classification, SG-WORLD-deposit-wallet-buffer, SG-WORLD-opening-mortgage-funding, SG-WORLD-macro-mortgage-spread) is resolved in src/core2/data/stopgaps.json with the reason.

**Files.** src/core2/modules/credit.ts, src/core2/modules/business.ts, src/core2/macro-model.ts

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).
