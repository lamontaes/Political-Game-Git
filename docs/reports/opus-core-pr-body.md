# Businesses keep their own cash steady, workers go to work, and retirees choose when to claim

Before: in Vonore, Tennessee, employers' cash doubled in a year, from $43.6 million to $93.6 million, piling up instead of moving through the town. In Birch Creek, Alaska, 3 of 19 businesses closed, all restaurants. In three towns, 8 of 46 workers the player can meet never went to a shift.

After: Vonore's employers end the year with $44.9 million of their own, plus money held for supplier bills. Birch Creek keeps every business. Every worker the player can meet goes to work. Every dollar balances.

**What you need to do:** play the evening build once the CTO merges this. It carries the CTO's audit fixes, Social Security claims, closing a business by choice, and saves.

## What changed for the player

- Towns keep their businesses: restaurants get their diners, and a town's only garage doesn't swallow every repair job.
- People work their shifts, part-time and full-time in realistic shares.
- Older people claim Social Security when it suits them, between 62 and 70, and start drawing it during play.

## Why each fix works

"Workers the player can meet" are the ones who exist as full people; the rest of the town is counted, not simulated one by one. Each result below was measured once in the places it names, with bookkeeping off.

**Owners stop taking the business's money.** What the code does now (inferred from the code):

- Every firm pays its outside suppliers, wholesalers included (`src/core2/opening-outside-market.ts:127`).
- Owners are paid only above one median cash buffer, after supplier bills already owed (`src/core2/modules/residents.ts:261`).

Measured in Vonore: before, firms kept supplier money they never paid out, and owners drew on it, so cash grew from $43.6 million to $93.6 million. After, firms end the year with $95.9 million on hand. $51.0 million of that is for supplier bills not yet due, which they now keep until they pay them. That leaves $44.9 million of their own, close to the $43.6 million they started with.

**No business gets sales it didn't earn.** What the code did (inferred from the code): any gap between a firm's books and its local sales was filled with sales to buyers outside the town. Now its outside sales are only its industry's sourced share of receipts (`src/core2/opening-outside-market.ts:124`). Measured: 2 of 27 businesses closed in Vonore and 1 of 29 in Sutherlin, Oregon, each with a recorded cause.

**Restaurants get their diners.** What the code does now (inferred from the code): each household's food budget splits between groceries and eating out by its region's share in the 2024 Consumer Expenditure Survey; nationally about 39% is eaten out (`src/core2/opening-finance.ts:1164`). Measured in Birch Creek: 3 of 19 businesses closed before the split, all three restaurants; 0 of 19 after.

**A small seller serves only what it can.** What the code does now (inferred from the code): spending beyond a seller's monthly capacity buys the same thing outside the town (`src/core2/modules/residents.ts:389`). Measured in North Johns, Alabama: the town's one-worker garage had taken about 24 times its projected sales and then closed; after the fix it stayed open, and 2 of 28 businesses closed.

**Workers go to work.** What the code did (inferred from the code): staying home from a shift counted twice toward a person's need for free time, so it often outscored going. Staying home now counts once (`src/core2/data/work.json:270`). Measured over two months in three towns (Elmwood Park, Wisconsin; Palma Sola, Puerto Rico; Hammond, Minnesota): 8 of 46 workers the player can meet never went before; 0 of 74 after. The count grew because main now keeps relatives' households as full people. In Dargan, Maryland, employed adults worked on 62.9% of days; the American Time Use Survey gives 66.4%.

**Realistic hours.** What the code did (inferred from the code): when the opening filled a town's jobs, it reused the hours of the first worker it found in each kind of job, and most of those worked part-time. New jobs now follow the town generator's part-time shares (`src/core2/opening-employment.ts:472`). Measured: part-time jobs fell from 98% to 27% in Dargan and from 99% to 29% in Chino Hills, California.

**Retirement is the person's decision inside the law.** What the code does now (inferred from the code): each retiree claims between 62 and 70, starting from the full retirement age for their birth year: earlier with little saved, later with more patience (`src/core2/retirement-claim.ts:41`). Measured over 3,694 generated retirees in Wayland, New York; Frederiksted, U.S. Virgin Islands; and Bloomingdale, Indiana: average claim age 64.1, against the Social Security Administration's 63.4–65.0.

## Checks

- Core tests: 1,610 of 1,610 pass.
- The golden-path suite is green. It now includes the year-long check that every dollar balances, which passed in Fallon, Nevada.
- Speed: a year in Vonore takes 25.5 seconds on this branch and 26.9 seconds on main.

## What happens next

- Main itself got slower: before the people team's relatives arrived, the same Vonore year took 11.3 seconds. Every household now gets its relatives when a town opens, so Vonore's counted population grew from 9,940 to 39,685 people and 96 people stay full instead of 64. I've asked the people team to build relatives only when a household is filled in; details are in `docs/coordination/core.md`.
- Opening Vonore takes 34.8 seconds on main, against 11.1 seconds before. Most of it goes to generating everyone in full before the town keeps only its full people; the same request would shorten it.

## Method

Measured on this branch on October 13, 2026, one run each, in the cloud. A full-game year took 34.9 seconds in one bench town before the relatives arrived; that run didn't record the town's name, so it isn't compared here.
