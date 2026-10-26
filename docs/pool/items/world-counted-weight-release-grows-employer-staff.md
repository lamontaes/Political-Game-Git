---
id: world-counted-weight-release-grows-employer-staff
title: "A filled-in household's weight moves to its group's other households, and their employers' counted staff grows with no hire (Washington, D.C. at Census size)"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by:
pr: #5866
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** When a counted household record is filled in, releaseWeight (src/core2/counted-groups.ts) spreads the other households it stood for over its group's remaining records. A remaining record's counted job then stands for more workers (countedHeadsOf reads the household's weight), so its employer's staff and payroll grow without a hire, and layOff (src/core2/modules/jobs.ts) refuses to lay off a record that stands for more heads than the staff is over by. Washington, D.C. at its Census size (seed dc-closures-a, scale 69.4): Dixon's Bowling Lanes (organization_e2a2729e26acde67) went from 49 counted records and 3,406 heads on Jan 20 (69.5 a record) to 35 records and 2,818 heads on Dec 16 (80.5 a record), 26 percent over its sales staff of 2,232, while the same town at the sample size shrank to its target (49 to 31 plus 5 full). Its wages over 340 days were 85 times the sample's against sales 75.6 times, and it closed on 2025-12-25 when the payroll came 36,154,827 short. Find where the released weight should go so an employer's heads follow its staffing decisions, and let a record that stands for many jobs shed part of them.

**Rules.** One model, two tiers: a counted job stands for the same jobs every reader counts, and the town's people stay counted. No dice. Every dollar balances.

**Done when.** In Washington, D.C. at its Census size (seed dc-closures-a) and one more drawn place above 100,000, built with buildBenchWorld and played a year, an employer's counted heads per record move only when it hires, lays off or a worker leaves, and its staff at year end is within its sales staff the way the sample-size run's is, named by organization and record ids in a test in src/core2. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/counted-groups.ts, src/core2/modules/jobs.ts, src/core2/residents-economy.ts

**Notes.** Found on PR #5803 (world-census-scale-closures-large-cities): it blocks that item's Washington, D.C. closure comparison after the Oct 22 main merge, which lowered the firm's residents' purchases by about 5 percent (18,574,370,233 to 17,667,652,857 minor units in 340 days) and tipped a firm already losing money at the Census size before the merge.

Sent back 2026-10-23 from PR #5866 (branch claude/weight-release-heads): counted-groups.ts:465-472 loses heads without a keeper (10 to1) and creates heads for a fractional fill-in (10.5 to11), reproduced in a direct store probe; preserve both cases and register/file the acknowledged seeker gap; finish on that branch, merge main into it first.

Sent back 2026-10-24 UTC from PR #5866 (branch claude/weight-release-heads): Checked 6083aadaf5 passed local gate and all5 changed tests, but pinned merge rejected405; fresh main90fb2a3982 conflicts in src/core2/modules/jobs.ts and stopgaps.json; preserve main staffing and per-job-head accounting, plus every registry row byID; finish on that branch, merge main into it first.

Sent back 2026-10-24 UTC from PR #5866 (branch claude/weight-release-heads): corrective head7e6cda5a1b still conflicts with current main in src/core2/modules/jobs.ts; resolve retaining hire behavior, per-job heads and payroll calendars before local recheck; finish on that branch, merge main into it first.

Sent back 2026-10-25 UTC from PR #5866 (branch claude/weight-release-heads): integrated a7c9052bf6 changes per-job heads and payroll without updating householdIncome/wagesMinorYear, which poverty still applies to full household weight; a controlled Trommald MN probe (root57585865cf3defdc, household_a2813740f322cf54, job work-relationship_02dd1704af76e917:kept:household_4455d65d241d5264) lowers heads9 to4.5 and payroll54271850 to29849517.5 cents/year while household income stays5427185; make those downstream readers agree and prove partial cuts/fill-in transfers; finish on that branch, merge main into it first.

Sent back 2026-10-25 18:57 UTC from PR #5866 (branch claude/weight-release-heads): annual sample control omits countScale=1 but buildBenchWorld now defaults omitted scale to Census, so required Census-versus-sample year proof instead compares two Census worlds; pass/verify distinct explicit scales and rerun both annual comparisons, retaining the new income repair; finish on that branch, merge main into it first.

Sent back 2026-10-25 from PR #5866 (branch claude/weight-release-heads): valid year/control and income tests now pass, but treasury payrollReserve and press outlet costs still size counted jobs by household weight instead of per-job heads; controlled Powell OH school-job cut19to9.5 lowers weighted payroll while reserve is unchanged; migrate remaining job-quantity readers and prove the downstream cost read; finish on that branch, merge main into it first.
