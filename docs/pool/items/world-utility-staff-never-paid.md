---
id: world-utility-staff-never-paid
title: "A town's electric and water utility staff are never paid: the utility holds no cash and takes in nothing from households"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/utility-household-bills
pr: #5033
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:20:13.489Z
---

**What.** A utility's staff are never paid. In the played world (`buildBenchWorld`, 120 days from the start) the Ware County Electric and Water employer in Manor, Georgia had one full-person job held since the opening, opened with $0 and paid $0 in payroll, and the Oconto County Rural Electric employer in Sobieski, Wisconsin is the same. Across five towns drawn (Manor, Paradise Valley, Texico, Ethan, Sobieski) 19 of 112 employers with a job held since the start never paid anyone in 120 days, and all but one held $0: nonprofits ("Neighbors United"), fire and public works departments, public schools, a post office, state offices in town and the two utilities. They are the zero-funded employers the opening models as pending dated funding (`unsupportedOpening` in `src/core2/data/opening-capital.json`, stopgap SG-P8-opening-unsupported-owner-funding). A utility earns from its customers, so it needs a revenue line from the households and businesses it serves, at rates the town or a commission sets, before it needs an opening buffer.

**Rules.** Wire to the world: a utility's payroll draws on revenue paid by named customers' own accounts at its rates, and the same dollar leaves theirs. Every dollar balances. One model, two tiers: counted households pay the rate by the same rule as full ones, times their count.

**Done when.** In the played world (`buildBenchWorld`, the drawn places Manor, Georgia and Sobieski, Wisconsin with the seeds v1 and v6, and one random place) a utility that employs a full person pays its payroll on every payday of 120 days, shown by payroll posting ids, from revenue its customers paid, shown by transfer ids; a test in `src/core2/` names the place and seed.

**Files.** src/core2/opening-capital.ts, src/core2/data/opening-capital.json, src/core2/modules/business.ts

**Notes.** Measured Oct 17 (claude) with a wrapper on `api.postJournal` summing `work-payroll` postings by organization, counting only employers whose job's work commitment started on or before February 1 (a first count that included jobs filled in during the run overstated it). The same family: `world-public-school-staff-never-paid` and `world-private-zero-cash-employers-never-pay` (#5016). The seeds are drawn with `drawPlace(seed, "unpaid")`.
