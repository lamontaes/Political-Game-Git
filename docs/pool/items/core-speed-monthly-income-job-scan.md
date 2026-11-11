---
id: core-speed-monthly-income-job-scan
title: "The election year scans every job for each household's monthly income (about 9 seconds of year 4)"
area: core
kind: bug
priority: 1
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** monthlyIncome (src/core2/modules/credit.ts line 1179) walks all of core.jobs for each household it is asked about. On Upper Witter Gulch, Colorado (0879800, seed 5a1c0de7a11ce5e1), core.jobs holds about 8,300 jobs, and year 4's profile puts 5.6 s of self time in monthlyIncome and 3.2 s in its callback, about 9 s of a year that runs 128.4 s against the 120 s bar. The profile lists two other year-4 leads, the counted appeal and a weekly scan of the causes table, but this item is only the job scan.

**Rules.** Speed: never scan the whole world or its history every day; use an index. The result must not change (speed:year --same-records).

**Done when.** monthlyIncome reads a person-to-open-jobs index instead of scanning core.jobs; npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1 shows year 4 under 120 s with --same-records passing. The Notes record that a plain person-to-jobs index changed nothing measurable, so the PR first shows by profile in a played world where monthlyIncome's time goes.

**Files.** src/core2/modules/credit.ts,src/core2/state.ts,src/core2/job-lifecycle.ts

**Notes.** State Sessions Nov 6. Checked on that world: of 7,457 open jobs only 69 are reachable through work.commitmentsByPerson (counted workers have no commitment), so the commitment index cannot stand in. A new jobsByPerson index has to be written wherever core.jobs is set (state.ts 438, 2336, 2371; job-lifecycle.ts 62, 93; restore from a saved record at state.ts 2307) and survive a restore. Other year-4 self-time leads from the same profile: countedAppeal in electorate.ts 5.7 s, foldCauses 2.6 s (a weekly full scan of the causes table, replaceable by a date index).

Nov 6, later: tried and reverted. A per-day person-to-jobs index in monthlyIncome (summed in the jobs map's own order, jobs read live by id) changed nothing measurable: Upper Witter Gulch year 4 ran 124.1 s with it and 123.5 s on plain main, same run, same machine, one process (years 1 to 3: 53.8/100.9/61.3 against 54.2/97.3/61.6). So the profile's 5.6 s of self time in monthlyIncome is not mostly the scan of core.jobs; do not build the index. Look first at how often monthlyIncome is called and from where (credit.ts line 1302 builds it lazily per household) and at the 3.2 s anonymous callback beside it.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: merge into core-speed-colorado-election-year-persuasion. Tried Nov 6: a person-to-jobs index changed nothing (year 4 124.1 s against 123.5 s). It is one lead of the Upper Witter Gulch year-4 profile (0879800, seed 5a1c0de7a11ce5e1) that core-speed-colorado-election-year-persuasion covers. The kept item now says `monthlyIncome` (src/core2/modules/credit.ts line 1179) must be traced by call count (line 1302 builds it lazily per household) and its 3.2 s callback before any index.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): merged into `core-speed-colorado-election-year-persuasion`, which carries this item's remaining work.
