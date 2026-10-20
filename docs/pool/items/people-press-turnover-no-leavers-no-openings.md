---
id: people-press-turnover-no-leavers-no-openings
title: "press-turnover.test: in 12 drawn towns a year saw no press staff leave, and a reporter who dies is not replaced in 240 days"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by:
pr: #4972
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `src/core2/press-turnover.test.ts` fails on a random seed (seed `bd451e751cad8c37`: no press opening filled in 12 drawn places; seed `230721c239b47783` in 4). Looking at three towns (Bend, Oregon; Center Sandwich, New Hampshire; Steptoe, Washington; the played world from October 12, 2026 for 365 days), 99 press staff, nobody left (no quit, layoff, death or move) and the jobs engine opened no position at any press outlet. Then, forcing the cause, a reporter's job was ended as a death on day one in four more towns (Yigo, Guam; Delavan, Wisconsin; Topaz Lake, Nevada; Crescent, Iowa): after 240 days no press position existed at all, so nobody was hired for the dead reporter. Find why the jobs engine opens no replacement for a press outlet's lost reporter (the outlet's employer row, its target staffing against the staff left, and the leaver record) and fix it at the root; then the test's premise (a leaver is replaced and the hire is on the masthead) can be proved.

**Rules.** No dice: a vacancy is filled from the outlet's staffing gap, the leaver's role and the town's seekers. Every dollar balances. One rule for all 56 places.

**Done when.** In a drawn place and a seed the builder did not choose, a reporter who dies on day one is replaced through a jobs hire that reaches the masthead within 240 days, shown by position and staff record ids, and `src/core2/press-turnover.test.ts` makes the death itself (it ends a reporter's job as a death) instead of waiting for one to happen by chance. The owner plays it: a paper that loses a reporter hires another.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/press.ts, src/core2/press-turnover.test.ts

**Notes.** Found triaging the sharded test sweep of src/core2 (Oct 17). A death-forcing test must end the job before the day's work (`endJob` throws once the person has worked that day), so do it right after the world is built, as `office-day-name-head.test.ts` does.

**Cause found (Oct 17, claude; superseded by the progress note below, which shows the jobs engine replaces a reporter whose death is a real event, so read the cash-cover reasoning here as a slow path for a gap of one, not a stop).** Every local outlet is enrolled as an employer (Ellis, Kansas: 5 of 5; Delavan, Wisconsin: 8 of 8), so the jobs engine does review it. But `reviewEmployers` (src/core2/modules/jobs.ts, about line 817) scales a firm's hiring by `reach = cash / (cash + jobsCashCoverMonths * monthlyPayroll)`, and the outlets hold almost no cash: three days into the run the newspaper in the first drawn town holds $2,798 against a monthly payroll of about $110,000, so reach is about 0.01 and a one-job gap (need grows by `jobsStaffGapActedPerMonth * gap * reach` a month) takes years to reach 1. The outlets open with `liquidMinor: 0` (src/core2/modules/press.ts, `addOrganization` near line 432) and live on weekly audience revenue, so they never carry the cash cover other firms open with (`src/core2/data/opening-employer-cash-reference.json`, JPMorgan Chase Institute buffer days for the information sector). Give each local outlet an opening cash cover from the owner's money by that reference (registered with the outlet-revenue stopgap `SG-PEOPLE-press-outlet-revenue`), then the death-forcing test can pass.

**Progress (Oct 17, claude).** The premise was wrong: the jobs engine replaces a lost reporter. Probed in Oak City, North Carolina (a local television outlet, a real `life.death` event on a reporter 35 days in): the next review opened `position:...:2026-12-01:1` with reason replaces-leaver, a new reporter was hired on Dec 8 and is on the masthead; the outlet's job count was back to 1. What failed the test was the death itself: ending the job with `endJob` is not a leaver (only a quit, a move or a death event notes one), and on day one it also ended the only job before the outlet joined the jobs engine, so no employer row ever existed. `press-turnover.test.ts` now places the death as a `life.death` event after the outlets have enrolled and passed six runs on random places. Natural turnover is rare in a year at press outlets (no quit, layoff, death or move in 99 staff over three towns) but that is the quit model, not a missing replacement. A run also hit "Cannot assign to read only property 'id'", the bug in `jobs-raise-unfilled-pay-read-only` (#4967).

