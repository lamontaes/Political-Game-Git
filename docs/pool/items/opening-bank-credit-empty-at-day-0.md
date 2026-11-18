---
id: opening-bank-credit-empty-at-day-0
title: "Banks open with no loans, deposits or household credit profiles"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the day-zero check (skill day-one-in-motion), Nov 14, measured on train head 8bb1ff9d; the Account lead called these tables stock"
claimed-at:
after:
lead: money
model: sonnet
effort: medium
root: day-one-in-motion
---

**What.** At creation the world keeps no rows in `credit.loans`, `part.core2-accounts.deposits`, `part.core2-accounts.depositsByHolder`, `part.core2-accounts.heldDeposits`, `credit.households`; they fill within a year of play (owner, Nov 14: "The town must be in motion on day one... not just town, but country and state. Remember, it's all one simulation.") Module: credit and accounts; levels as listed in the Cause. A real place has what the banks already hold: loans, deposits and households' credit profiles. First read whether the deposit tables are kept apart from account balances; if not, file the removal of the extra tables by hand and take them out of the day-zero file. Seen: the first screens on day 0 read empty until the year passes.

**Cause.** Measured: `node --import tsx scripts/dev-tests/day-zero-year.ts a1 365` and `... b2 365` on train head 8bb1ff9d, Washington, District of Columbia (`drawPlace("a1", "day-zero")`) and Lewiston, Maine (`drawPlace("b2", "day-zero")`), two-level population, opening Jan 20, 2025. Rows at creation / after 1 / 31 / 365 days: `credit.loans` (town and county; creation / day 1 / day 31 / year 1) 0/1/13/8292 at Washington, 0/18/23/13550 at Lewiston; `part.core2-accounts.deposits` (town and county; creation / day 1 / day 31 / year 1) 0/50/98/828 at Washington, 0/97/168/607 at Lewiston; `part.core2-accounts.depositsByHolder` (town and county; creation / day 1 / day 31 / year 1) 0/50/98/828 at Washington, 0/97/168/607 at Lewiston; `part.core2-accounts.heldDeposits` (town and county; creation / day 1 / day 31 / year 1) 0/50/98/828 at Washington, 0/97/168/607 at Lewiston; `credit.households` (town and county; creation / day 1 / day 31 / year 1) 0/0/0/3555 at Washington, 0/0/0/4121 at Lewiston. Not yet traced to the first writer; the first step is to read the function that first writes each table in src/core2/modules/credit.ts and see what the opening leaves undone.

**Fix.** Opening stock comes from the engine that makes the flow, run backward or run ahead (a warm-up of its own step, or a draw from its own steady state with the place's own figures), never a second generator and never a hand-filled list. Change the first writer of each table in the files below. The numbers come from the place's rows, never from a place named in code.

**Warm-up result (Nov 14, 31-day warm-up of src/core2/player-warm-up.ts, measured at Washington DC and Lewiston ME on train head b7ed6337).** The warm-up fills `credit.loans`, `part.core2-accounts.deposits`, `part.core2-accounts.depositsByHolder`, `part.core2-accounts.heldDeposits` at both places; their known-red marks are gone. Still empty after it: `credit.households`. This item now covers only those; the engine that owns each writes its stock for the past date inside the warm-up window.

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Day one in motion (`.agents/skills/day-one-in-motion/SKILL.md`): one engine per mechanic; no dice (seeded generation of who exists is allowed, nothing after day 0 is a draw); one rule, all 56 places; estimate, never UNKNOWN; replace, never layer; a year stays under two minutes (`speed:year` before and after, table in the PR body).

**Done when.** A second session, not the builder, builds a world at a drawn place and seed it names (`buildBenchWorld`, two-level) and sees the listed table(s) with rows at creation, by record id; the row for `credit.loans`, `part.core2-accounts.deposits`, `part.core2-accounts.depositsByHolder`, `part.core2-accounts.heldDeposits`, `credit.households` in `src/core2/data/opening/day-zero.json` has its `knownRed` mark removed, and `src/core2/day-zero.test.ts` passes at its two pinned places.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts; src/core2/accounts.ts; src/core2/data/opening/day-zero.json
