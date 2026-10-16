---
id: gov-bribe-buys-a-contract
title: "A bribe can buy a public contract award, not only a vote"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "found by gov-u6-with-the-pillar"
---

**What.** A bribe on a bill already moves the member's position (`bribePull` in corruption.ts, read in `memberPosition`), and lobbyists offer them at meetings (interest-groups.ts `offerBribe`). Nothing else reads a bribe: a treasury splits each budget line's purchases among the town's providers by headcount (`providersIndex` in budgets-treasury.ts) whatever anyone paid. Make the award read the bribe: an owner of a provider weighs bribing the official who controls the line (the executive or the body that adopted the budget), and the treasury's split gives a provider whose owner paid a taken bribe on that line a larger share, by a sliding weight, with the bribe cited as a reason on the award record.

**Rules.** No dice: the offer and the taking follow traits, money and relationships, and the award follows the weight, never a percentage. An effect is a read: the treasury reads the bribe at the moment it splits the line. Ask why: the award record keeps the bribe's id. The chain is the acceptance: one bribe to the award it bought, the payment that changed, the owner reached and the case that cites it. One rule, all 56 places.

**Done when.** In a one-year played world (`buildBenchWorld`) in a drawn place, a provider whose owner paid a taken bribe on a budget line receives more of that line than headcount alone gives, named by the award record id and the bribe id, and a test in `src/core2/corruption.test.ts` covers accepted-and-delivered, accepted-and-reneged and refused.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/corruption.ts, src/core2/modules/interest-groups.ts

**Notes.** Found by gov-u6-with-the-pillar: the vote path was already built and is covered by the three-outcome test in legislature.test.ts; background bribes on bills are rare (two offers, none taken, in four drawn years).
