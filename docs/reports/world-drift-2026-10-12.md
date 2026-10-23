# Twenty years run calm, with no recession and too much cash

Over 20 game years in three random towns, the national economy never left its real 1990–2026 ranges. It settles by 2027 and then barely moves: no recession and no boom in two decades, where real history has one every seven to ten years. Two things to know before playing long games. First, nothing in the economy yet causes a downturn, so a long career sees steady times. Second, each town's businesses and residents pile up $531 million to $630 million in 20 years, almost all of it paid in from outside the town. No decision is needed. The cash is the core team's to fix; recessions need causes, which are planned below.

## What the runs show

All figures come from `src/core2/tooling/world-drift.ts`, one 20-year run per town, saved as `drift-<key>.json`.

**The national economy stays inside its real ranges (measured).** In each town the tool made 766 checks: every 12-month change in each national monthly and quarterly series, against the 1990–2026 bands (`src/core2/macro-model.ts:249`). None of the 766 fell outside, in any of the three towns.

**It settles into a steady state and stays there (measured).** Year-end figures from 2027 to 2040:

|                             | Adrian, Missouri | Floyd, New Mexico | Shumway, Illinois |
| --------------------------- | ---------------- | ----------------- | ----------------- |
| Unemployment                | 4.16%            | 4.16%             | 4.33% to 4.37%    |
| Consumer price inflation    | 2.52%            | 2.52%             | 2.49% to 2.50%    |
| Policy rate                 | 2.63%            | 2.63%             | 2.88%             |
| 30-year mortgage rate, 2040 | 5.61%            | 5.61%             | 5.74%             |

Only the mortgage rate keeps moving, rising a few hundredths of a point a year. The central bank's preferred inflation measure reads about 2.1% against its 2% goal.

**There is no business cycle (inferred from the model).** The national step moves only from its own momentum, the policy rate and the town's income. Nothing outside it pushes: no oil shock, no financial crisis, no pandemic. With no push, it decays to rest (`src/core2/macro-model.ts:181`).

**Unemployment stays below its natural rate (measured, cause inferred).**

- **The level:** unemployment rests at 4.16% to 4.37% against the model's 4.5% natural rate, so the economy runs slightly hot and never cools.
- **The board's view:** members want a rate about 0.2 points above the current one.
- **Why the rate doesn't move:** each member closes only part of that distance at each meeting. The board moves in quarter-point steps and weighs each move against keeping the rate steady, so a pull of a few hundredths of a point never wins and the board holds (`src/core2/central-bank-board.ts:299`).

**Each town fills with outside money (measured).** Cash held by the town's people and businesses after 20 years, and the net paid in from outside:

- Adrian, Missouri: $588 million held, $582 million paid in
- Floyd, New Mexico: $630 million held, $625 million paid in
- Shumway, Illinois: $531 million held, $525 million paid in

In Absecon, New Jersey (a three-year run on October 12, 2026), most of the growth came from one wholesaler. In 2021 its sales were $157.6 million against $84.0 million of yearly demand for its goods, nearly twice what the market wanted, and it paid none of its $75.5 million operating costs. The same happens with the core alone, without the economy engines. It sits in the core's outside-market stand-in (`SG-CORE-outside-market` in `src/core2/data/stopgaps.json`), and the request to the core team is in `docs/archive/2026-10-23/coordination/world.md` under "Needs from other sessions".

**The town income figure fed to the national economy swung from −22% to +41% a year (measured, fixed).** The calculation compared one month's income with the same month a year earlier, so a month with three biweekly paydays read as growth. It now compares the last twelve months with the twelve before them (`src/core2/modules/macro.ts:109`).

## What happens next

- **Fixed on October 12, 2026:** the twelve-month town income comparison, and a crash in the Shumway run when a business hired a counted worker twice on one day (now a dated wage flow, `src/core2/residents-economy.ts:47`).
- **With the core team:** the wholesaler's outside sales and unpaid costs.
- **Planned (economy):** downturns from causes, such as a rise in oil or import prices, a credit tightening when the bank's capital falls, or a dated national event, so long games see recessions. Also a small rate move when the board's pull is real but under a quarter point, so unemployment returns to its natural rate.

Method: three towns drawn at random (Adrian, Missouri, seed `13531d1a…`; Floyd, New Mexico, seed `130b2f33…`; Shumway, Illinois, seed `7ad1f620…`), each run 20 years from January 1, 2021 with every economy engine, 281 to 381 seconds each. These runs predate the twelve-month income fix.
