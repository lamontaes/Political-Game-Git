# Businesses keep their own cash steady, workers go to work, and retirees choose when to claim

Before: in Vonore, Tennessee, employers' cash went from $43.6 million to $93.6 million in a year. In Birch Creek, Alaska, 3 of 19 businesses closed, all of them restaurants. In three towns, 8 of 46 named workers never went to a shift.

After: Vonore's employers end the year with $44.9 million of their own, besides supplier bills held until due. No business closes in Birch Creek. In the same three towns, every named worker goes to work. Every dollar balances.

**What this is:** the core's first part is on main (owner approval, October 12, 2026). This carries the fixes from the CTO's code audit and newer pieces; the CTO merges it, and the owner checks it in the evening build.

## What changed for the player

- Towns keep their businesses: restaurants get their diners, and a town's only garage doesn't swallow every repair job.
- People work their shifts, part-time and full-time in realistic shares.
- Older people claim Social Security when it suits them, between 62 and 70, and start drawing it during play.
- "Named workers" are the workers who exist as full people, the ones the player can meet; the rest of the town is counted, not simulated one by one.

## Why each fix works

Each result below was measured once in the places it names, with about 10,000 generated people and bookkeeping off.

**Owners stop taking the business's money.** What the code does now (inferred from the code):

- Every firm pays its outside suppliers, wholesalers included (`src/core2/opening-outside-market.ts:127`).
- Owners are paid only above one median cash buffer, after supplier bills already owed (`src/core2/modules/residents.ts:261`).

Measured in Vonore: before, employers' cash grew from $43.6 million to $93.6 million in a year. After, it ends the year at $95.9 million on hand. $51.0 million of that is supplier bills not yet due, which firms now keep until they pay them instead of handing to owners. That leaves $44.9 million of their own, close to the $43.6 million they started with.

**No business is topped up.** What the code does now (inferred from the code): a firm's sales to buyers outside the town are only its industry's sourced share of receipts (`src/core2/opening-outside-market.ts:124`). Measured: 2 of 27 businesses closed in Vonore and 1 of 29 in Sutherlin, Oregon, each with a recorded cause.

**Restaurants get their diners.** What the code does now (inferred from the code): the household food budget splits by the 2024 Consumer Expenditure Survey's share eaten away from home, about 39%, by region (`src/core2/opening-finance.ts:1164`). Measured in Birch Creek: 3 of 19 businesses closed before the split, all three restaurants; 0 of 19 closed after.

**A small seller serves only what it can.** What the code does now (inferred from the code): spending beyond a seller's monthly capacity buys the same thing outside the town (`src/core2/modules/residents.ts:389`). Measured in North Johns, Alabama: the town's one-worker garage had taken about 24 times its projected sales and then closed; after the fix it stayed open, and 2 of 28 businesses closed.

**Workers go to work.** What the code did (inferred from the code): each need also becomes a goal of the same urgency, and staying home served the "recover" goal, which only mirrors the time need. So staying home counted that need twice, and people with savings stayed home every day. Staying home now serves no goal of its own (`src/core2/data/work.json:270`). Measured over two months in three towns (Elmwood Park, Wisconsin; Palma Sola, Puerto Rico; Hammond, Minnesota): 8 of 46 named workers never went before, and none of 74 after. In Dargan, Maryland, employed adults worked on 62.9% of days; the American Time Use Survey gives 66.4%.

**Realistic hours.** What the code did (inferred from the code): when the opening filled a town's jobs, it reused the hours of the first worker it found in each kind of job, and most of those worked part-time. New jobs now follow the town generator's part-time shares (`src/core2/opening-employment.ts:472`). Measured: part-time jobs fell from 98% to 27% in Dargan and from 99% to 29% in Chino Hills, California.

**Retirement is the person's decision inside the law.** What the code does now (inferred from the code): each retiree claims between 62 and 70, starting from the full retirement age for their birth year: earlier with little saved, later with more patience (`src/core2/retirement-claim.ts:41`). Measured over 3,694 generated retirees in Wayland, New York; Frederiksted, U.S. Virgin Islands; and Bloomingdale, Indiana: average claim age 64.1, against the Social Security Administration's 63.4–65.0.

## Checks

- Core tests: 1,610 of 1,610 pass.
- The golden-path suite is green. The year-long money check (M0-08) now runs in it and passed in Fallon, Nevada.
- Speed: a year in Vonore took 16.7 seconds before today's speed work and 12.9 seconds after.

## What happens next

- A year in the full game, with every team's engines, took 34.9 seconds in one bench town (seed play-year-a; that run didn't record the town's name, so it can't be set beside Vonore yet). The core alone runs a year in about 13 seconds; I haven't yet measured how the rest splits among the other engines.
- Opening a town took 12.1 seconds in Dove Creek, Colorado, mostly generating all 10,000 people in full. A short loading screen needs the people team's builder to generate the wider population lightly.
- Requests from other teams are answered in `docs/coordination/core.md`.
