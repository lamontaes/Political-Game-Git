---
id: release-main-red-outlook-money-drift-town-part
title: "Dev mode's 20-year outlook says the country cannot be: the town's part makes and loses dollars each month"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-outlook-money-drift
pr: 8996
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (Account lead T7 on #8928, comment 6842671869)
---

**What.** `src/bench/dev-outlook.test.ts` fails on clean main in nearly every drawn place: Hagåtña, Guam (DEV_MODE_SEED=407cf5672cb2f1da), El Chaparral, Texas (bb4c89efc75cd75a), Ash Grove, Missouri (24bc87d3e7e66f9c) and Bruning, Nebraska (776a993f8b09cf32). Dev mode's outlook says the country's next 20 years could not be (`couldBe` false) with no problem listed, because its dollars drift by 0.005% (4.9e-5 against a bound of 1e-9). Seen: dev mode's outlook says the country could be, and its money adds up.

**Cause.** Found in code: since #8333 (2b98cee96e, Nov 10; drift 1.1e-14 before it, 4.9e-5 with it), `stepCountry` in src/core2/country-model.ts takes the played places' part out of their state before it steps and puts it back after. `takeOutPart` scales the state's books by its people (`scaleWithPeople`) and each sector's by its jobs (`scaleWithJobs`), and `putInPart` scales them back by the ratio after the step. The rest of the state moved during the step, so the two factors do not cancel, and the state's cash, owners' income and sector cash change by a little every month (`countryMoney`).

**Fix.** `takeOutPart` keeps the money it moved out (the state's cash, owners' income, each sector's cash) and `putInPart` gives it back whole, scaled by the part's people and jobs now against when it was taken out. With the same part in and out (the outlook) not a dollar is made or lost; flows (sales, budgets) keep their scaling.

**Time box.** 1 hour

**Rules.** Wire to the world: every dollar the tier holds is accounted for, and a part of a state moves money only by what its people and jobs did. No dice: no figure is drawn.

**Done when.** A second session runs dev-outlook.test.ts on main at DEV_MODE_SEED=407cf5672cb2f1da and at a fresh seed, each naming its drawn place, and all five cases pass; in dev mode in a drawn place, the outlook says the country could be.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts
