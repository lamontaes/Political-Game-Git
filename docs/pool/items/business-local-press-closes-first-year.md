---
id: business-local-press-closes-first-year
title: "Every local newspaper, radio and TV station closes in the first year for want of revenue"
area: world
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Cochituate, Massachusetts (key 2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc) the town's press outlets close with reason finance.unfunded-obligation-cash-and-credit-exhausted (finance-state.ts around 1990): 5 of 30 businesses in year 1, 1 more in year 2. Outlets are created in press.ts (around 380-410) with costs and no sustaining revenue (subscriptions, advertising). This alone breaks the state's BDS exit range in roadmap M1-08's check, and leaves towns with no news outlet for M2-09.

**Rules.** Wire to the world: an outlet's revenue must come from people and businesses paying it through the journal, the same rule as any seller, so its survival follows its readers and advertisers.

**Done when.** A one-year played world (buildBenchWorld) in Cochituate, Massachusetts (seed above) and two more drawn places keeps its press outlets open unless their books fail for a recorded reason other than having no revenue line, named by organization id in the PR body; the outlets' revenue entries are on the journal by id. **On screen.** Nothing yet: filed play-town-paper-on-screen, which puts it on News.

**Files.** src/core2/modules/press.ts, src/core2/finance-state.ts

**Notes.** TODO
Already fixed on main (claude pool worker, Oct 27, main 2026-10-27 evening): `GOLDEN_PATH_SEED=93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc GOLDEN_PATH_PLACE_KEY=2514570 CORE2_BOOKKEEPING=0 node --import tsx scripts/core2-year/closures.mjs` in Cochituate, Massachusetts reports "1 under 10% close: 1 of 52 (1.9%)", and every press outlet row (Cochituate Enterprise, News, Tribune, Review, WUGM, WINK, WJFQ, WZHD, WJNO-TV, WTME-TV, WUQG-TV, among others) has an empty closedAt after the year. Two more drawn places, seeds pr1 (Hope Valley, Rhode Island: 2 of 46 closed) and pr2 (Humphrey, Nebraska: 0 of 42), closed no outlet either. The outlets' revenue entries on the journal were not traced here. Left open for the CTO or a merger to close as done-by-main. (M0-08 still prints FAIL on "balances, matched" in the same run; that is core-city-treasury-trillions-dickens.)

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built.
