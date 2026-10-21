---
id: gov-public-contract-awards
title: "A government awards public contracts to businesses from its budget lines"
area: gov
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/political-game-pool-yucp92
pr: #5166
after:
blocked-on:
source: owner ruling, Oct 19, 2026 (via the acting CTO)
claimed-at: 2026-10-19T21:24:46.544Z
---

**What.** A government with a budget line for work it does not do itself awards a contract to a business, chosen from bids by the body's own rules and the officials' traits and views, paid from the line through the treasury to the business's books. The award is a decision the body makes on record, not a dice roll. It is the decision gov-bribe-buys-a-contract needs before a bribe can change which bidder wins.

**Rules.** "No dice": the winner comes from the bids, the body's rules and the officials' traits and views, never a roll. "The chain is the acceptance: one dollar followed from the budget line to the firm to its workers."

**Done when.** A played year in a drawn place, started with buildBenchWorld, shows one public contract award by record id: the body's bid decision, the payment on the journal from the budget line through the treasury, and the firm's payroll moving in the months after.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/business.ts

**Notes.** Owner ruling, Oct 19, 2026, via the acting CTO: yes, the game awards public contracts. Unblocks gov-bribe-buys-a-contract.

Oct 20: PR #5166 merged to main: a body's vote awards each budget line's outside work to a town firm that is paid from the line and pays its workers; members' views are still unread (see gov-contract-award-weights-review).
