---
id: world-utility-purchased-power-outflow
title: "A utility keeps the whole of its household bills as cash: it pays nothing for the power and water it sells"
area: world
kind: bug
priority: 3
size: M
status: done
claimed-by: claude/political-game-pool-yucp92-af
pr: #5616
blocked-on: world-utility-staff-never-paid
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:58:59.763Z
---

**What.** A town's electric and water utility is an employer with no business book and no cash. Once its household bills reach it (world-utility-staff-never-paid, in PR #5033), nothing leaves it for the power and water it resells, so the whole bill stays as cash and the utility looks rich while it buys supply from nobody. Give the utility an outside-supply cost flow sized from the sourced share of a utility's revenue that goes to purchased power and water, paid to the place's outside account the way a business's outside-costs flow is, so the bill splits between payroll, supply and what is kept.

**Rules.** Wire to the world: the supply cost is read from the revenue the utility took in, and the same dollar leaves its account for the outside account. Research before building: the supply share cites its source and spread (utility cost shares by type), as an estimate with a spread. One model, two tiers: counted and full households pay the same rate, so the revenue is the sum over both.

**Done when.** In the played world (buildBenchWorld) in a drawn place with a utility employer and a seed the builder did not choose, over a year the utility's supply payments to the outside account are within the sourced spread of its household revenue, shown by transfer record ids, and every dollar balances; a test in src/core2 names the place and seed.

**Files.** src/core2/opening-capital.ts, src/core2/opening-outside-market.ts, src/core2/data/opening-capital.json

**Notes.** Checked Oct 19 (claude/utility-power-outflow): in Mongmong-Toto-Maite, Guam (seed d41e) the only utility, Spence Rural Electric Cooperative, is a plain employer with $0 and no finance book, so there is no revenue to split yet. This item waits on world-utility-staff-never-paid. Nothing was built.
