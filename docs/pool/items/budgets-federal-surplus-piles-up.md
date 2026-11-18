---
id: budgets-federal-surplus-piles-up
title: "A federal surplus piles up in the U.S. Treasury's account instead of paying down the debt, and stops a long game in year 13"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/long-game-federal-surplus
pr: #9835
after:
blocked-on:
root: none
lead: money
model: fable
effort: medium
source: Long game lane, Nov 17 (the year-13 stop at Inarajan, Guam; issue 9747)
---

**What.** Once a world's federal receipts pass its outlays, the U.S. Treasury keeps every surplus dollar in its account. At Inarajan, Guam (seed 426e846c0d8d670dcf6b366852affad6b4f5d0a40f84c3d639a165315194a834), its cash went from $1 million in June 2031 to $98 billion in July and $777 billion by November, and the outside market's net passed 2^53 cents in year 13, which stopped the run.
Seen: a monthly replay of that world (the long game's probe): spending stays near $7.1 trillion a year in every budget, receipts grow from $5.2 trillion (fiscal 2025) to $7.5 trillion (fiscal 2031) and $8.5 trillion (fiscal 2032), and the Treasury's paid-out falls to its outlays while what it took stays above.

**Cause.** Found in code: `sweepReserves` in src/core2/budgets-treasury.ts invests a state or local treasury's cash above its reserve and skips the federal one ("The federal treasury borrows instead"); `closeTreasuries` borrows when the Treasury is short and does nothing when it holds more than it needs, so a surplus is never used.

**Fix.** At each close, after the month's payments, what the U.S. Treasury holds above the month of standing payments it keeps back (`standingReserve`) repays the groups that hold its debt, in the shares of what each is owed, down to zero debt (`repayFederalSurplus`). Each holder's balance falls exactly (the debt split) and its repaid principal is kept. No new figure: the amount kept back is the engine's own standing payments.

**Time box.** 2 hours.

**Rules.** No dice; one rule for all 56 places; no count, rate or level set from a real figure (CTO, Nov 17); exact sums past 2^53 in a long save.

**Done when.** `src/core2/federal-surplus.test.ts` passes at a drawn place and fails on main's code (Congress halves every federal spending line through the budget engine's own amendment, and the debt falls over three closes); a second session runs a 20-year drawn-place game and reads the U.S. Treasury's account staying near its standing reserve in every year with a surplus.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/federal-surplus.test.ts (new), src/core2/federal-debt.test.ts

**Notes.**

- Nov 17, Long game: why receipts pass outlays at all is a separate question for the budget lead: each year's federal spending repeats the first plan in nominal dollars, while receipts follow the nation's wage bill. Not changed here.
