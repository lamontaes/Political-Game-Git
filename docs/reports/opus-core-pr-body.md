# Town money now holds its shape, workers go to work, and retirees claim their own benefits

Before: in Vonore, Tennessee, employers' cash went from $43.6 million to $93.6 million in a year. In Birch Creek, Alaska, all three restaurants closed. In three drawn towns, 8 of 46 full workers never went to a shift.

After: Vonore's employers end the year with $44.9 million of their own, plus $51.0 million of supplier bills they still owe. No business closes in Birch Creek. In the same three towns, every worker goes to work. Every dollar balances.

**What this is:** the core's first part is on main (owner approval, October 12, 2026). This carries the fixes from the CTO's code audit and newer pieces; the CTO merges it, and the owner checks it in the evening build.

## What changed for the player

- Towns keep their businesses: restaurants get their diners, and a town's only garage doesn't swallow every repair job.
- People work their shifts, part-time and full-time in realistic shares.
- Older people claim Social Security when it suits them, between 62 and 70, and start drawing it during play.

## Why each fix works

Each result below was measured once in the named place, with about 10,000 generated people and bookkeeping off.

**Cash stopped ballooning.** What the code does now (inferred from the code):

- Every firm pays its outside suppliers, wholesalers included (`src/core2/opening-outside-market.ts:127`).
- Owners are paid only above one median cash buffer, after supplier bills already owed (`src/core2/modules/residents.ts:261`).

Measured in Vonore: employers' cash $43.6 million → $93.6 million before. After: $95.9 million at year end, of which $51.0 million is supplier bills still owed, leaving $44.9 million.

**No business is topped up.** A firm's sales to buyers outside the town are only its industry's sourced share of receipts (`src/core2/opening-outside-market.ts:124`). Measured: 2 of 27 businesses closed in Vonore and 1 of 29 in Sutherlin, Oregon, each with a recorded cause.

**Restaurants get their diners.** What the code does now (inferred from the code): the household food budget splits by the 2024 Consumer Expenditure Survey's share eaten away from home, about 39%, by region (`src/core2/opening-finance.ts:1164`). Measured in Birch Creek: 3 of 3 restaurants closed before the split; 0 of 19 businesses closed after.

**A small seller serves only what it can.** What the code does now (inferred from the code): spending beyond a seller's monthly capacity buys the same thing outside the town (`src/core2/modules/residents.ts:389`). Measured in North Johns, Alabama: the town's one-worker garage had taken about 24 times its projected sales and then closed; after the fix it stayed open, and 2 of 28 businesses closed.

**Workers go to work.** The choice between going to work and staying home counted the "time" need twice for staying home, so people with savings stayed home every day. It now counts it once (`src/core2/choice.ts:144`). Measured in Elmwood Park, Wisconsin, Palma Sola, Puerto Rico and Hammond, Minnesota, over two months: 8 of 46 full workers never went before, and 0 after. In Dargan, Maryland, employed adults worked on 68.6% of days; the American Time Use Survey gives 66.4%.

**Realistic hours.** The opening copied whichever recorded hire it found for each job, and most of those were part-time. Copies now follow the town generator's part-time shares (`src/core2/opening-employment.ts:472`). Measured: part-time jobs fell from 98% to 27% in Dargan and from 99% to 29% in Chino Hills, California.

**Retirement is the person's decision inside the law.** Each claims between 62 and 70, starting from the full retirement age for their birth year: earlier with little saved, later with more patience (`src/core2/retirement-claim.ts:41`). Measured over 3,694 generated retirees in three towns: average claim age 64.1, against the Social Security Administration's 63.4–65.0.

## Checks

- Core tests: 1,610 of 1,610 pass.
- The golden-path suite is green. The year-long money check (M0-08) now runs in it and passed in Fallon, Nevada.
- Speed: a year in Vonore took 16.7 seconds before today's speed work and 12.9 seconds after.

## What happens next

- A year in the full game, with every team's engines, took 34.9 seconds on the bench. Most of that is the other engines; I'm working on the core's share.
- Opening a town takes about 12 seconds, mostly generating all 10,000 people in full. A short loading screen needs the people team's builder to generate the wider population lightly.
- Requests from other teams are answered in `docs/coordination/core.md`.
