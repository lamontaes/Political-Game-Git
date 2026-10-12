# Businesses keep their cash steady, workers go to work, and a sales tax or school pay law reaches real people

Before: in Vonore, Tennessee, employers' cash doubled in a year, from $43.6 million to $93.6 million. In three towns, 8 of 46 workers the player can meet never went to a shift. Sales taxes collected nothing; no town had a public school.

After: Vonore's employers end the year with $44.9 million of their own. In those towns, every such worker goes to work. Sales taxes pay the treasury; each town has public school teachers. Money balanced in every run.

**What you need to do:** after the merge, pass a sales tax in the evening build and watch the treasury.

**Known problem on main:** Scenic, Arizona and Camp Pendleton Mainside, California wouldn't open; the people team has the cause.

## What changed for the player

- Towns keep their businesses: restaurants get their diners, and a town's only garage doesn't swallow every repair job.
- People work their shifts, part-time and full-time in realistic shares.
- Older people claim Social Security when it suits them, between 62 and 70, and start drawing it during play, whether the player has met them or not.
- A sales-tax law collects on every purchase in town and pays the treasury.
- Every town has a public school district with teachers for its children, so school pay laws reach real teachers.
- Officials the game fills in from a name and office get their own personalities instead of blank ones.

## Why each fix works

"Workers the player can meet" are the ones who exist as full people; the rest of the town is counted, not simulated one by one. Each result below was measured once in the places it names, with bookkeeping off.

**Owners stop taking the business's money.** What the code does now (inferred from the code):

- Every firm pays its outside suppliers, wholesalers included (`src/core2/opening-outside-market.ts:127`).
- Owners are paid only above one median cash buffer, after supplier bills already owed (`src/core2/modules/residents.ts:261`).

Measured in Vonore: before, cash grew from $43.6 million to $93.6 million in a year; the code shows firms never paid outside suppliers, and owners drew on that money. After, firms end the year with $95.9 million on hand. $51.0 million of that is for supplier bills not yet due, which they now keep until they pay them. That leaves $44.9 million of their own, close to the $43.6 million they started with.

**No business gets sales it didn't earn.** What the code did (inferred from the code): any gap between a firm's books and its local sales was filled with sales to buyers outside the town. Now its outside sales are only its industry's sourced share of receipts (`src/core2/opening-outside-market.ts:124`). Measured: 2 of 27 businesses closed in Vonore and 1 of 29 in Sutherlin, Oregon, each with a recorded cause.

**Restaurants get their diners.** What the code does now (inferred from the code): each household's food budget splits between groceries and eating out by its region's share in the 2024 Consumer Expenditure Survey; nationally about 39% is eaten out (`src/core2/opening-finance.ts:1164`). Measured in Birch Creek, Alaska: 3 of 19 businesses closed before the split, all three restaurants; 0 of 19 after.

**A small seller serves only what it can.** What the code does now (inferred from the code): spending beyond a seller's monthly capacity buys the same thing outside the town (`src/core2/modules/residents.ts:389`). Measured in North Johns, Alabama: the town's one-worker garage had taken about 24 times its projected sales and then closed; after the fix it stayed open, and 2 of 28 businesses closed.

**Workers go to work.** What the code did (inferred from the code): staying home from a shift counted twice toward a person's need for free time, so it often outscored going. Staying home now counts once (`src/core2/data/work.json:270`). Measured over two months in three towns (Elmwood Park, Wisconsin; Palma Sola, Puerto Rico; Hammond, Minnesota): 8 of 46 workers the player can meet never went before; 0 of 74 after. The count grew because main now keeps relatives' households as full people. In Dargan, Maryland, employed adults worked on 62.9% of days; the American Time Use Survey gives 66.4%.

**Realistic hours.** What the code did (inferred from the code): when the opening filled a town's jobs, it reused the hours of the first worker it found in each kind of job, and most of those worked part-time. New jobs now follow the town generator's part-time shares (`src/core2/opening-employment.ts:472`). Measured: part-time jobs fell from 98% to 27% in Dargan and from 99% to 29% in Chino Hills, California.

**Retirement is the person's decision inside the law.** What the code does now (inferred from the code): each retiree claims between 62 and 70, starting from the full retirement age for their birth year: earlier with little saved, later with more patience (`src/core2/retirement-claim.ts:41`). People the player hasn't met claim too, and their award goes with them when the player meets them (`src/core2/modules/retirement-claims.ts:225`). Measured over 3,694 generated retirees in Wayland, New York; Frederiksted, U.S. Virgin Islands; and Bloomingdale, Indiana: average claim age 64.1, against the Social Security Administration's 63.4–65.0.

**Sales tax reaches every purchase.** What the code does now (inferred from the code): a tax in force on a place takes its share out of each paid sale there, from named and counted households alike. The seller pays it to the treasury the same day (`src/core2/modules/purchase-tax.ts:87`). Measured in Carolina, West Virginia (seed tax-a), at 7% with general stores exempt: 238 taxed sales worth $674,373 paid the treasury $44,116.71, exactly the tax inside them. The 132 exempt sales paid nothing.

**Towns have public schools.** What the code does now (inferred from the code): each town gets a public school district. The number of teachers is the town's children aged 5 to 17, times the 0.87 share in public school, divided by 15.4 pupils per teacher. Both figures come from the National Center for Education Statistics (`src/core2/opening-public-schools.ts:85`). The teachers are workers the opening hadn't given a job. Measured: North Palm Beach, Florida got 65 teachers for 1,159 children; Vonore got 129 for 2,289.

**No one is paid for days before the game starts.** What the code did (inferred from the code): when the opening grouped the counted workers' pay, the first payday paid a whole pay period, even when most of it fell before the opening. Now it pays only the days since the opening, as it already did for named workers (the grouping, `src/core2/residents.ts:370`). Measured in Interlochen, Michigan: a kitchen owed a month of wages on January 5, 2021 had closed, along with 2 other businesses (3 of 28). After the fix, 1 of 28 closed.

**Officials have personalities.** What the code did (inferred from the code): an official filled in from a name and office got an empty trait list. Now they get traits from the people team's temperament model, seeded by the world and the person (`src/core2/state.ts:2034`). Measured in Bismarck, North Dakota (seed off-a): a governor filled in this way got all 98 traits a generated resident carries, on the −2 to 2 scale where 0 is the middle 40% of people. 47 of them sit above or below the middle, for example deliberation 1 and sociability −1. Before, the list was empty.

## Checks

- The blocking golden-path checks pass.
- The year-long business check isn't blocking yet. It passed in Interlochen, and in 5 of 6 more random places: Lavalette, West Virginia; Sherwood, North Dakota; Las Piedras, Puerto Rico; Oneonta, Alabama; and Sunnyvale, California. Washington, D.C. failed with 3 of 23 businesses closed (the limit is under 10%). Money balanced in all seven.
- New golden-path checks. A custom world with different wages, household cash, outside demand, political lean and turnout showed each setting (Hopelawn, New Jersey). An old build's save loaded and played on (Greenville, Delaware).
- Speed: a year in Vonore takes 27.3 seconds on this branch and 26.9 seconds on main.

## What happens next

- In D.C., the closures were a private school, a fitness center and a cafe. A separate run in Aniak, Alaska (seed y26-c) also failed: 4 of 21 closed, two general stores, a fitness center and a private school. These firms were staffed from the county's job mix, and their sales were projected from that payroll. In Aniak, local customers buy 11% of a general store's projected sales and 8% of the fitness center's; the private school has no local customers at all. I've proposed staffing them to what their customers buy and asked the CTO.
- Main itself got slower: before the people team's relatives arrived, the same Vonore year took 11.3 seconds. Every household now gets its relatives when a town opens, so Vonore's counted population grew from 9,940 to 39,685 people, and 96 of them stay full people instead of 64 of 9,940. I've asked the people team to build relatives only when a household is filled in.
- Opening Vonore takes 34.8 seconds on main, against 11.1 seconds before. Most of it goes to generating everyone in full before the town keeps only its full people; the same request would shorten it.
- Games are meant to open in 2026, matching today's laws. The opening can do that now: Biddle, Montana; Mina, Nevada; Aniak, Alaska; and Amonate, Virginia each ran two months from January 1, 2026, with money balanced. The switch waits for the CTO to schedule it, because every team's tests use 2021 dates.

## Method

Measured on this branch on October 12, 2026, one run each, in the cloud. Vonore used seed hours-a; details for every run are in `docs/coordination/core.md`.
