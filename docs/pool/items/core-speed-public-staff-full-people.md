---
id: core-speed-public-staff-full-people
title: "A funded public employer's staff are all full people, which adds about 36 s to a dense town's year (Long Hill, 214 s to 257 s)"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** PR #5044 (school staff pay) made the public school district a funded employer, and staff of a funded employer are kept as full people because pay for a counted public workforce is not built. In Long Hill, Connecticut (seed m7b) the bisected year went from 220.3 s (e715c5bc7) to 256.7 s (0a4bf1e41), +36 s, with about 13 s more after the next merge, because every extra full person acts each day: perform, activate, work onDay, relationship changes and news telling. Pay the district's teachers (and any other funded department's staff) as a counted workforce through the treasury, the way a counted worker is paid by an employer, or give the staff the weekly tier a town's other public workers use, so a dense town's year stops growing with its teacher count, without changing who is paid or how much.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person, times its count, so a funded employer's counted workers are paid by the same treasury payroll as full ones. Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Every dollar balances.

**Done when.** In a played world (buildBenchWorld) in a drawn place and in Long Hill, Connecticut (seed m7b), the district's teachers are paid by the treasury as before (school-pay.test.ts and department-pay.test.ts pass, the payments named by record id), the count of full people from the district falls, and npm run speed:year -- --seed m7b --exclusive is at most 233 s in the PR body receipts, with a CPU profile showing work onDay and activate back near 30 s each.

**Files.** src/core2/opening-department-pay.ts, src/core2/opening-public-schools.ts, src/core2/population.ts

**Notes.** TODO

Where it happens (read Oct 20, claude/political-game-pool-b6g0dl; nothing built). `fullPeople` in src/core2/residents.ts (line 219, "Who stays a full person: the circle, whole households, and public workers") keeps as a full person every worker whose employer has a `publicPayAuthority`, and then every member of that worker's household ("Households are never split: their contracts and cash are shared"). `counted-demotion.ts` (line 96) keeps the same people from being returned to the counts. #5044 gave the school district a pay authority, so every teacher and every teacher's whole household stopped being counted and now acts every day. The replacement that the PR names as unbuilt is the pay: a counted worker of a public employer paid by the treasury payroll the way a counted private worker is paid by an employer (payroll against the group's fund, withholding by the same `withholdingFor`), after which `fullPeople` and the demotion rule stop keeping such workers full. Until then a cheaper step is to count how many full people each public employer adds in a dense town (Long Hill) and measure the year with only the teachers, not their households, kept full, to see what share of the 36 s that is.

Counted Oct 20 in Long Hill (seed m7b, key 0943580; buildBenchWorld, then people by tier): at e715c5bc7 the district had 3 teachers and the world 1,809 full people (119 weekly, 1,628 calendar, 37 monthly, 25 husk-tier) and 1,520 husks; at 0a4bf1e41 (#5044) it has 114 teachers and 2,224 full people (534 weekly, same others) and 5,498 husks. So 114 teachers bring 415 weekly full people (their whole households) and about 4,000 more husk relatives, and the year rose 36 s with them.
