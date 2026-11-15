---
id: credit-shortfall-reads-cash-not-bank-savings
title: "A household with savings at the bank asks for a personal loan when its wallet runs below a month of costs"
area: world
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "found by T54 building world-counted-renters-buy (#9117), Nov 15; Account lead's ruling 08:58Z: its own item and pull request"
---

**What.** The town's bank and storefront lender take a personal-loan application from any household whose cash is below one month of its costs, even when the same household holds savings at the bank that would cover it. A real household draws its savings before it borrows. Seen: in dev mode, a household under credit's applications whose bank deposits are larger than the loan it asked for.

**Cause.** Found in code: `borrowingHouseholds` in src/core2/modules/credit.ts builds each household's `cash` from its wallet alone, for full households (members' `liquidMinor`) and counted ones (`householdCashReader`, its share of its group's account). The application step compares that `cash` with a month of costs (`if (cash >= costs) continue;`) and sizes the need as `1 - cash / costs`. The household's deposits, kept by `reviewBankDeposits` in src/core2/credit-deposits.ts under the household's own id and read with `depositsHeld` in src/core2/accounts.ts, are never read there. Deposits are swept above a wallet of months of costs and only refilled at the bank's monthly review, so between reviews a household with savings can sit under a month of cash. Housing's buyers already count cash plus deposits (`means` in src/core2/modules/housing.ts, and counted buyers on #9117).

**Fix.** In `borrowingHouseholds`, add the household's savings to what it holds: `depositsHeld(core, h.id)` for a full household, and `depositsHeld(core, h.id) / weight` for a counted one, whose deposits are banked for every household its record stands for. The shortfall and its size then read wallet plus savings, the same for both tiers. No new parameter.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: the same read for a full and a counted household, times its weight. No dice. Wire to the world: fewer asks moves the bank's loans, interest and what people say about borrowing.

**Done when.** A test pinned at a named place and seed shows a household holding deposits of more than a month of costs does not apply, by household id, and one with neither does. Applications in the first six weeks at three named places, before and after, are in the pull request body with year 1 time per record. A second session sees in dev mode, at a drawn place it names with its seed, that no applicant's bank deposits exceed a month of its costs.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts

**Notes.**

Dropped Nov 15 (Account lead's ruling, 09:30Z): the read is right in code, but no world exercises it. Measured from the player's day one (31-day warm-up) on the Train at fd52b031: Matagorda, Texas (4847016, `drawPlace("pt1:0","path-check")`) 7 personal-loan applications to Aug 1; Bastrop, Louisiana (2204685, `drawPlace("c3","home-price-paths")`) 5 to Aug 1; Bloomingdale (3406340, `drawPlace("e5","home-price-paths")`) 29 to Mar 1. Not one applicant held any bank savings. Why: `reviewBankDeposits` (src/core2/credit-deposits.ts) banks only cash above a wallet of `creditDepositWalletMonths` (3) months of costs and refills the wallet at each monthly review, so a household holding deposits does not sit under one month of cash when the bank reviews. A test would have to invent a household the game cannot make. Reopen if the wallet rule or the monthly refill ever changes.
