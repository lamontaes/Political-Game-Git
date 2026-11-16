---
id: credit-young-adult-at-home-never-borrows
title: "A grown person short of money borrows only if they are the oldest in their home, so an 18-year-old living with family never gets a loan"
area: world
lead: effects
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Promises builder, Nov 15 (Account lead's ruling on #9517: note it, do not change it there)"
checked:
---

**What.** The credit engine asks only a household's oldest member whether to borrow, so a grown son or daughter living with family never borrows, whatever their own money. A new game's 18-year-old player lives at home, so a player who starts the default way can never take a personal loan or a payday loan, and a promise to pay on time has no loan of their own to stand on. Seen: on a new 18-year-old's Money and Journal, no loan ever shows however short their cash runs, while an older player made with the New game creator's birthday borrows from the bank or the payday lender.

**Cause.** Found in code: src/core2/modules/credit.ts, the monthly personal borrowing pass (line 1704, `const head = [...members].sort(...)[0]`): the household's members are sorted by birth date and the first one alone is weighed by `personalBorrowingDecision` and written as `borrowerId`. The household's cash and costs are pooled, so nobody else in the home is ever asked. Measured: at Cherry Hill, Virginia, seed promises-real-loan-1 draw loan:2, by `npx vitest run src/director/promises.test.ts -t "pay on time"`, a player born 1985-03-01 who heads the home takes a payday loan on Apr 1, 2025; at the same seed, 18-year-old players heading no home held no loan in any of the nine draws tried (tests/support/real-borrower.ts).

**Fix.** In the personal borrowing pass, weigh each grown member whose own cash is short of their own share of the home's costs with `personalBorrowingDecision`, and write the loan to the member who says yes (`borrowerId`), with the bank's yes read from that member's income. The oldest member keeps the household-wide shortfall. The player sees it on their Money screen and Journal: a loan in their own name when they run short at home.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: who borrows comes from each member's own cash, costs, traits and income, never a draw. One model, two tiers: a counted household's grown members are weighed by the same rule, times their count.

**Done when.** A second session starts a default new game (an 18-year-old at home) in a drawn place, named with its seed, plays until the player's own cash runs short, and finds a loan with the player as `borrowerId` on the credit engine's loans table and on the player's Money screen; a one-year run shows the town's loan count against its base with the time per record within the speed bar.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, tests/support/real-borrower.ts

**Notes.**

- Nov 15: found while giving the pay-on-time promise a real loan (#9517). The promises tests use the New game creator's birthday to pick a player who heads a home; that stays until this lands.
