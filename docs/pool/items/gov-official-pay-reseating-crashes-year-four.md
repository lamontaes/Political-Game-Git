---
id: gov-official-pay-reseating-crashes-year-four
title: "Official salary review crashes a fourth-year played world when starting a salaried post"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by: lane-2/official-pay-reseating
pr: #7217
blocked-on:
lead: governing
source: added with npm run pool -- add
claimed-at: 2026-11-04T07:21:51.252Z
---

**What.** A four-year baseline run in Absecon Highlands, New Jersey (3400160), replay c89c92ac66b703f1, crashes in year four at official-pay.ts seat() calling startSalariedPost. The thrown message says a salaried post needs a living person, a recorded employer and no shift hours; that guard also rejects an existing job ID. Three years completed on base cf31d0ed63, with no sibling-name correction applied. The failing guard condition is not yet isolated; do not assume death from the generic message.

**Rules.** One engine per mechanic: fix the official seating/payroll producer through the existing job lifecycle without bypassing its guard. No dice and no weakened tests; preserve salary earned before service ends.

**Done when.** The exact Absecon Highlands replay completes all four years in buildBenchWorld without this crash, and a regression names the official, term, employer and job record IDs that previously violated the job guard. It fails without the fix and passes with it; a fresh drawn place also opens and runs.

**Files.** src/core2/modules/official-pay.ts, src/core2/job-lifecycle.ts (Lane 5 agreement required before editing core), regression test

**Notes.** Found by Lane 2 during the sibling-name baseline. Command: npm run speed:year -- --seed c89c92ac66b703f1 --years 4 --max-seconds 120 --exclusive. Years 1-3: 53.8/59.2/108.1 s, then startSalariedPost job-lifecycle.ts:88 <- official-pay.ts:229 <- review:337. Logs /tmp/lane-2-sibling-speed-attempt-1/. Existing dead-official and first-paycheck items were searched; neither records this fourth-year guard failure. No production change or test relaxation made.
