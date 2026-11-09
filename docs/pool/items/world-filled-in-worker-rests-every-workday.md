---
id: world-filled-in-worker-rests-every-workday
title: "A filled-in worker can skip every scheduled workday and is never paid"
area: world
kind: bug
priority: 2
size: M
status: done
lead: jobs
claimed-by:
pr: #7930
blocked-on:
source: Money, Nov 9; src/core2/fill-in-paid-once.test.ts
claimed-at:
---

**What.** Chassell, Michigan (key 2614900, seed bb): after 30 counted workers were filled in together, person_03c9efdcdc96781c (truck driver at Drake Trucking, work-relationship_94e209388ef11b63, tier weekly) missed all 54 scheduled days in 75 days: attended 0 of 28,905 planned minutes, earned 0, paid 0, last choice "rest" (reason planned:utility:time:recover, time need 0.77). Filled in alone, the same person attended 21,837 minutes and was paid 772,322. So the payroll is right (a worker who attends is paid, and no filled-in worker is in a counted wage flow, which `fill-in-paid-once.test.ts` checks at 3 drawn places) and the attendance choice is what leaves the pay at nothing.

**Rules.** No dice; sliding scales: a worker with a time need of 0.77 should work fewer shifts, not none. Wire to the world: the choice reads the person's stress, needs, job and the employer's schedule. One model, two tiers.

**Done when.** At the same place and seed, `npx vitest run src/core2/fill-in-paid-once.test.ts` and a count of missed against planned days for the 30 filled-in workers shows no worker missing every planned day without a recorded cause (sickness, leave, an employer closure) named by record id.

**Files.** src/core2/work-attendance.ts, src/core2/modules/work.ts

**Notes.** Money found it measuring that nobody is paid twice or not at all (queue item 1). Jobs owns attendance and what an employer pays.
