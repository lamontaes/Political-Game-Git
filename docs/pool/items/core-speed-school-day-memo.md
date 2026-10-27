---
id: core-speed-school-day-memo
title: "Whether a date is a school day is worked out once, not for every person every day"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/speed-school-day-memo
pr: #6076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T09:27:48.967Z
---

**What.** A profile of a played year in Discovery Harbor, Hawaii (seed m7a) shows onHoliday in modules/school.ts at 0.7 seconds of self time, 1.5 percent of the year. isSchoolDay is a pure function of the date, yet due() calls it for every person each day, rebuilding Date objects for each holiday row.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower; Replace, never layer: the repeated work is removed in isSchoolDay itself, not hidden behind a second wrapper.

**Done when.** A fresh profile of npm run speed:year on seed m7a shows onHoliday under 0.2 percent of the year, and the school day tests in src/core2/school.test.ts pass, shown in the PR body.

**Files.** src/core2/modules/school.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5389 (branch claude/speed-school-day): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5389 (branch claude/speed-school-day): docs/pool/items/core-speed-school-day-memo.md:20 requires a fresh seed-m7a speed:year profile showing onHoliday below 0.2 percent, reported in the body. Both the body and the latest post-conflict update say that measurement was not taken on this head. Provide the named profile result for the current onBaseCalendar memo implementation, retaining the state-aware cutoff and the school tests; the earlier wall time is not that profile proof.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5389 (branch claude/speed-school-day): the exact full seed-m7a played-year profile and matched speed evidence remain unmet; the later receipt covers only eleven months with an uncommitted fix; existing merger return still applies with no corrective source commit; finish on that branch, merge main into it first.

Ready Oct 25 (speed lead), not opened while the play-first freeze holds: branch `claude/speed-school-day-memo` at 94ee907aec (base main ac0c6e2fac, no code change from 01f5cd4715); PR #5389 was closed Oct 25 under the CTO's Oct 24 ruling. `isSchoolDay` keeps its last date, state and answer, since every school-age person asks about the same day. The done-when: `node --cpu-prof … scripts/speed-years/run.ts --seed m7a --exclusive` (Discovery Harbour, Hawaii, key 1505900) shows `onHoliday` at 0.801 s of 61.2 s (1.31 percent) on main and absent (under 0.003 s) on the branch; `school.test.ts` passes (3). Exact: deep fingerprints identical (Long Hill year one `3350c66a3805f1e8`; Stanardsville years one to three as in core-speed-press-town-adults). `school-voucher-law`, `schools-by-era` (3), `school-outcomes` (4) and `school-pay` (2) pass; the last two need a 4 GB test heap here on main too (`tests-world-tests-outgrow-worker-heap`). <!-- british-spelling-ok: Discovery Harbour is the place's name -->
