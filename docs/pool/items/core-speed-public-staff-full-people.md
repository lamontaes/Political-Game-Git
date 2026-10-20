---
id: core-speed-public-staff-full-people
title: "A funded public employer's staff are all full people, which adds about 36 s to a dense town's year (Long Hill, 214 s to 257 s)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/counted-school-staff
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:53:19.616Z
---

**What.** PR #5044 (school staff pay) made the public school district a funded employer, and staff of a funded employer are kept as full people because pay for a counted public workforce is not built. In Long Hill, Connecticut (seed m7b) the bisected year went from 220.3 s (e715c5bc7) to 256.7 s (0a4bf1e41), +36 s, with about 13 s more after the next merge, because every extra full person acts each day: perform, activate, work onDay, relationship changes and news telling. Pay the district's teachers (and any other funded department's staff) as a counted workforce through the treasury, the way a counted worker is paid by an employer, or give the staff the weekly tier a town's other public workers use, so a dense town's year stops growing with its teacher count, without changing who is paid or how much.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person, times its count, so a funded employer's counted workers are paid by the same treasury payroll as full ones. Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Every dollar balances.

**Done when.** In a played world (buildBenchWorld) in a drawn place and in Long Hill, Connecticut (seed m7b), the district's teachers are paid by the treasury as before (school-pay.test.ts and department-pay.test.ts pass, the payments named by record id), the count of full people from the district falls, and npm run speed:year -- --seed m7b --exclusive is at most 233 s in the PR body receipts, with a CPU profile showing work onDay and activate back near 30 s each.

**Files.** src/core2/opening-department-pay.ts, src/core2/opening-public-schools.ts, src/core2/population.ts

**Notes.** TODO
