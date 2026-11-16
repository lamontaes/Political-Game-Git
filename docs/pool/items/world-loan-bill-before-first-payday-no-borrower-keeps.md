---
id: world-loan-bill-before-first-payday-no-borrower-keeps
title: "No played borrower can keep a promise to pay on time: the loan's bill comes due before the first paycheck from new work"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "Promises thread, Nov 16 02:05Z: the one-hour hunt for a kept pay-on-time case on Train ef708196; Account lead's order to file it as a fault in the world"
checked:
---

**What.** This is a fault in the world, not a missing test pin. A player who misses a loan payment can promise to pay on time and then take a job, but no played borrower keeps that promise. The bill on the 1st comes before the first paycheck from new work, or is larger than it, so the next payment is missed as well. Seen: at Ragland, Alabama, a $161 bill on Sep 1 finds the borrower at $0, and the first paycheck of $614 lands on Sep 5.

**Cause.** Measured: at Ragland, Alabama (draw loan:16 on seed promises-real-loan-1, born 1995-03-01), by the pay-on-time test in `src/director/promises.test.ts` with a script outside it that took the next job, on Train ef708196. The loan comes from `borrowingHouseholds` in src/core2/modules/credit.ts: an amount of `costs * creditPersonalMonthsOfCosts` (2 months of living costs), billed monthly on the 1st and read from the borrower's own `liquidMinor` (`borrowerCash`). #9532 more than doubled the living costs that size is drawn from, so Ragland's July loan went from $1,545 (payment $72) to $3,464 (payment $161). Ragland's employer 975710 now pays monthly, where employer 3c768e paid $214 weekly on Aug 29 before #9532. The four players who borrow in draws loan:20 to loan:55 (born 1995), loan:20 to loan:41 (born 1990) and loan:20 to loan:29 (born 1985):

- Ragland, Alabama (16, born 1995): loan Jul 1, $3,464. A job call comes on Aug 12, first pay is $614 on Sep 5, and the Sep 1 bill is missed at $0 while the housemate holds $2,169.
- East Carbon, Utah (29, born 1990): loan Sep 1, missed on Nov 1 and Dec 1.
- Eastport, New York (38, born 1995): loan Jun 1, missed every month. After taking work on Aug 12, the first pay of $83 lands Aug 21 and is gone by the Sep 1 bill.
- Sabana Eneas, Puerto Rico (31, born 1995): borrows, with no money quarrel by Dec 22.
  Watsonville, California (41) refuses the player at both births.

**Fix.** Start in `borrowingHouseholds` in src/core2/modules/credit.ts and the first pay date in src/core2/work-pay-period.ts. Find which real rule a borrower who takes work would meet: a payment sized from income, not costs; a first bill a full cycle after the loan; or a first paycheck on the employer's real cycle. Build that rule from research, with its number as a sourced or estimated row. Do not move a due date for one case. The player sees it when, after taking work, their next payment is paid and the person they promised says so in the next talk.

**Time box.** 4 hours for one Sonnet session.

**Rules.** No dice: whether the next bill is paid follows from the borrower's cash, pay date and bill, never a chance or a cap tuned to make it pass.

**Done when.** A second session, in a drawn place with a player borrower, takes work after the promise through the job call's scene and sees the next bill paid and the promise kept. The pay-on-time test in src/director/promises.test.ts gets back its kept half, pinned to that place and seed by name.

**Waits on.** The renters thread's lenders pair (fix A, `claude/project-thread-w31iec-loans`, and the other borrowing reasons) lands first, because it changes who borrows and for how much.

**Files.** src/core2/modules/credit.ts, src/core2/work-pay-period.ts, src/core2/data/credit/parameters.json, src/director/promises.test.ts, tests/support/real-borrower.ts

**Notes.** Nov 16: the kept line "You paid {payment} on time. I noticed." (conversation.promise-kept-raise.you-paid-payment-on-time-i-noticed, Words lead, Nov 15) was taken out of data/english/parts/conversation.json on #9517 because no played borrower reaches it (second reader hold, Account lead 02:23Z). It returns with the kept half of the pay test, through the Words lead, once a pinned place plays it.
