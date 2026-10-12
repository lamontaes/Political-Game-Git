# A town's year now runs in seconds, and its businesses stay open

**Owner: this branch needs your approval to merge onto main.** The core merges first; government, people and world build on top of it. Please play an evening build made from this branch, then approve the merge if the build plays well.

Before: one January in Higden, Arkansas, took 589 seconds, about two hours for a year, and a year in Cheat Lake, West Virginia, closed 14 of 25 businesses.

After: one game year takes about 13 seconds and every dollar balances. On the current build, 2 of 28 businesses closed in Mill Plain, Connecticut, and 1 of 28 in Hobbs, Indiana.

## What changed for the player

- Skipping ahead no longer means waiting: a year passes in about 13 seconds.
- Businesses have customers, pay their workers and suppliers, and pay their owners.
- Anyone the player meets becomes a full person. They keep the job and pay the employer's books record. Their household comes with them, along with the household's share of the town's money and their scheduled shifts.
- A new town takes about 12 seconds to open.

## Why each fix works

**Bookkeeping is off in play.** Read tracing, re-checking, deep copies and the journal's second lookup now run only in tests (`src/core2/bookkeeping.ts:9`). Measured: one January in Higden, Arkansas, took 589 seconds before and 194 seconds after, with the same cash and closures.

**Two levels of people.** Full people are the player, their household, family and the people they know, plus public workers. Everyone else is household records plus one shared account per place, whose wages, retirement income and purchases move as dated journal entries (`src/core2/residents.ts:217`). Measured on the current build: Mill Plain kept 62 of 10,004 people full and ran a year in 13.2 seconds; Hobbs kept 43 of 10,001 and ran a year in 12.7 seconds.

**Filling someone in keeps every total.** Measured in a randomly drawn place each test run: the person count, the employer's worker count and the town's cash are the same before and after (`src/core2/residents.test.ts:111`).

**Closures had a cause.** Measured in Cheat Lake, West Virginia, before the fix: 14 of 25 firms closed, and 11 of those 14 sold nothing all year because no customer route reached their industry (posted on #3918). What the code now does (inferred from the code, measured in the results above): each firm sells to buyers outside the town, sized from its industry's share of receipts in the 2017 Economic Census and USDA data (`src/core2/opening-outside-market.ts:67`). It also pays outside suppliers for costs it doesn't buy locally, 30 days later (supplier payments, `src/core2/modules/residents.ts:217`). The closure rule is unchanged, and no firm is topped up.

**Money circulates.** What the code now does (inferred from the code), as registered stand-ins until OPUS-WORLD's engines replace them:

- Rent and other living costs not bought locally are paid out of town on the 1st (`src/core2/residents.ts:149`).
- Firms pay cash above twice their industry's usual buffer to owners each month (`src/core2/modules/residents.ts:154`).
- The opening places only some workers in town firms. In Mill Creek, Oklahoma, 1,809 of an employment target of 5,195 had jobs; the other 3,386 now earn the town's median wage (`src/core2/residents.ts:676`).

**Accounts.** What the code now does (inferred from the code; its contract tests pass): engines open named accounts, move money in one balanced entry, and schedule payments that come due, with arrears when owed (`src/core2/accounts.ts:137`). The residents' money goes through the same writer.

## Checks

- The golden-path suite (M0-10, M0-11) is green.
- Core tests: 1,562 of 1,562 pass. The branch started with 63 failing tests inherited from the session that built the core before me (SOL-1258), because their test setups predated paydays; the setups were updated.
- Every dollar balances in each measured year: closing cash equals opening cash plus everything paid in from outside, minus everything paid out.

## What happens next

- Opening a town takes about 12 seconds, mostly generating 10,000 people in full. A short loading screen needs PEOPLE's population builder to generate counted households lightly.
- Public payroll drawn from a government treasury needs treasuries built at the opening; the design question is in my status file for GOV.
- Requests from other sessions are answered in `docs/coordination/core.md`.

Method: each year ran once in a randomly drawn place of about 10,000 generated people, on one cloud container, with bookkeeping off. Times exclude opening the town.
