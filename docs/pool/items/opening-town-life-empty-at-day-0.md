---
id: opening-town-life-empty-at-day-0
title: "Schools, grievances, prices, permits and drives open empty"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the day-zero check (skill day-one-in-motion), Nov 14, measured on train head 8bb1ff9d; the Account lead called these tables stock"
claimed-at:
after:
lead: people
model: sonnet
effort: medium
root: day-one-in-motion
---

**What.** At creation the world keeps no rows in `core2-school-days-v1.groups`, `grievance.grievances`, `core2-homeless-count-v1.counts`, `place-prices.felt`, `place-prices.learned`, `core2-public-safety-v1.permits`, `part.core2-drives-runtime.countedByPerson`, `business.operating`, `core2-outcome-web-v1.laws`, `core2-renewal-v1.pregnancies`, `core2-school-days-v1.college`, `part.core2-drives-runtime.byPerson`, `part.core2-drives-runtime.drives`, `part.core2-residents.incomeHistory`; they fill within a year of play (owner, Nov 14: "The town must be in motion on day one... not just town, but country and state. Remember, it's all one simulation.") Module: core2-school-days, grievance, homeless-count, place-prices, public-safety, drives, business, outcome-web, renewal and residents; levels as listed in the Cause. A real place has what a town already has on an ordinary day: classes in session, grievances people hold, a homeless count, prices people know, permits held, goals and drives people have, businesses operating, pregnancies and income history. Seen: the first screens on day 0 read empty until the year passes.

**Cause.** Measured: `node --import tsx scripts/dev-tests/day-zero-year.ts a1 365` and `... b2 365` on train head 8bb1ff9d, Washington, District of Columbia (`drawPlace("a1", "day-zero")`) and Lewiston, Maine (`drawPlace("b2", "day-zero")`), two-level population, opening Jan 20, 2025. Rows at creation / after 1 / 31 / 365 days: `core2-school-days-v1.groups` (town and county; creation / day 1 / day 31 / year 1) 0/0/10/23 at Washington, 0/0/8/20 at Lewiston; `grievance.grievances` (town and county; creation / day 1 / day 31 / year 1) 0/0/2/138 at Washington, 0/0/6/153 at Lewiston; `core2-homeless-count-v1.counts` (town and county; creation / day 1 / day 31 / year 1) 0/0/1/1 at Washington, 0/0/1/1 at Lewiston; `place-prices.felt` (town and county; creation / day 1 / day 31 / year 1) 0/0/170/222 at Washington, 0/0/356/516 at Lewiston; `place-prices.learned` (town and county; creation / day 1 / day 31 / year 1) 0/0/170/252 at Washington, 0/0/352/460 at Lewiston; `core2-public-safety-v1.permits` (town and county; creation / day 1 / day 31 / year 1) 0/0/199/266 at Washington, x at Lewiston; `part.core2-drives-runtime.countedByPerson` (town and county; creation / day 1 / day 31 / year 1) 0/0/5/377 at Washington, 0/0/8/195 at Lewiston; `business.operating` (town and county; creation / day 1 / day 31 / year 1) 0/0/1/11 at Washington, x at Lewiston; `core2-outcome-web-v1.laws` (town and county; creation / day 1 / day 31 / year 1) 0/0/0/16 at Washington, 0/0/0/26 at Lewiston; `core2-renewal-v1.pregnancies` (town and county; creation / day 1 / day 31 / year 1) 0/0/0/6 at Washington, 0/0/0/6 at Lewiston; `core2-school-days-v1.college` (town and county; creation / day 1 / day 31 / year 1) 0/0/0/113 at Washington, 0/0/0/129 at Lewiston; `part.core2-drives-runtime.byPerson` (town and county; creation / day 1 / day 31 / year 1) 0/0/0/53 at Washington, 0/0/15/81 at Lewiston; `part.core2-drives-runtime.drives` (town and county; creation / day 1 / day 31 / year 1) 0/0/0/79 at Washington, 0/0/53/181 at Lewiston; `part.core2-residents.incomeHistory` (town and county; creation / day 1 / day 31 / year 1) 0/0/0/338 at Washington, 0/0/0/289 at Lewiston. Not yet traced to the first writer; the first step is to read the function that first writes each table in src/core2/modules/school.ts and see what the opening leaves undone.

**Fix.** Opening stock comes from the engine that makes the flow, run backward or run ahead (a warm-up of its own step, or a draw from its own steady state with the place's own figures), never a second generator and never a hand-filled list. Change the first writer of each table in the files below. The numbers come from the place's rows, never from a place named in code.

**Warm-up result (Nov 14, 31-day warm-up of src/core2/player-warm-up.ts, measured at Washington DC and Lewiston ME on train head b7ed6337).** The warm-up fills `core2-homeless-count-v1.counts`, `core2-outcome-web-v1.laws`, `grievance.grievances`, `part.core2-drives-runtime.countedByPerson`, `place-prices.felt`, `place-prices.learned` at both places; their known-red marks are gone. Still empty after it: `business.operating (at Lewiston only)`, `core2-public-safety-v1.permits (at Lewiston only)`, `core2-renewal-v1.pregnancies`, `core2-school-days-v1.college`, `core2-school-days-v1.groups`, `part.core2-drives-runtime.byPerson (at Washington only)`, `part.core2-drives-runtime.drives (at Washington only)`, `part.core2-residents.incomeHistory`. This item now covers only those; the engine that owns each writes its stock for the past date inside the warm-up window.

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Day one in motion (`.agents/skills/day-one-in-motion/SKILL.md`): one engine per mechanic; no dice (seeded generation of who exists is allowed, nothing after day 0 is a draw); one rule, all 56 places; estimate, never UNKNOWN; replace, never layer; a year stays under two minutes (`speed:year` before and after, table in the PR body).

**Done when.** A second session, not the builder, builds a world at a drawn place and seed it names (`buildBenchWorld`, two-level) and sees the listed table(s) with rows at creation, by record id; the row for `core2-school-days-v1.groups`, `grievance.grievances`, `core2-homeless-count-v1.counts`, `place-prices.felt`, `place-prices.learned`, `core2-public-safety-v1.permits`, `part.core2-drives-runtime.countedByPerson`, `business.operating`, `core2-outcome-web-v1.laws`, `core2-renewal-v1.pregnancies`, `core2-school-days-v1.college`, `part.core2-drives-runtime.byPerson`, `part.core2-drives-runtime.drives`, `part.core2-residents.incomeHistory` in `src/core2/data/opening/day-zero.json` has its `knownRed` mark removed, and `src/core2/day-zero.test.ts` passes at its two pinned places.

**Waits on.** Nothing.

**Files.** src/core2/modules/school.ts; src/core2/modules/grievance.ts; src/core2/modules/place-prices.ts; src/core2/modules/public-safety.ts; src/core2/modules/drives.ts; src/core2/modules/business.ts; src/core2/modules/residents.ts; src/core2/data/opening/day-zero.json

**Notes.** Nov 15 (views thread): the known-red marks for `part.core2-drives-runtime.byPerson` and `.drives` were removed by d82bf47e while both were still empty at Washington, District of Columbia (1150000), which turned the day-zero test red there; they are back, at Washington only, naming this item.
