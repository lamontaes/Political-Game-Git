---
id: people-press-turnover-no-leavers-no-openings
title: "press-turnover.test: in 12 drawn towns a year saw no press staff leave, and a reporter who dies is not replaced in 240 days"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `src/core2/press-turnover.test.ts` fails on a random seed (seed `bd451e751cad8c37`: no press opening filled in 12 drawn places; seed `230721c239b47783` in 4). Looking at three towns (Bend, Oregon; Center Sandwich, New Hampshire; Steptoe, Washington; the played world from October 12, 2026 for 365 days), 99 press staff, nobody left (no quit, layoff, death or move) and the jobs engine opened no position at any press outlet. Then, forcing the cause, a reporter's job was ended as a death on day one in four more towns (Yigo, Guam; Delavan, Wisconsin; Topaz Lake, Nevada; Crescent, Iowa): after 240 days no press position existed at all, so nobody was hired for the dead reporter. Find why the jobs engine opens no replacement for a press outlet's lost reporter (the outlet's employer row, its target staffing against the staff left, and the leaver record) and fix it at the root; then the test's premise (a leaver is replaced and the hire is on the masthead) can be proved.

**Rules.** No dice: a vacancy is filled from the outlet's staffing gap, the leaver's role and the town's seekers. Every dollar balances. One rule for all 56 places.

**Done when.** In a drawn place and a seed the builder did not choose, a reporter who dies on day one is replaced through a jobs hire that reaches the masthead within 240 days, shown by position and staff record ids, and `src/core2/press-turnover.test.ts` makes the death itself (it ends a reporter's job as a death) instead of waiting for one to happen by chance. The owner plays it: a paper that loses a reporter hires another.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/press.ts, src/core2/press-turnover.test.ts

**Notes.** Found triaging the sharded test sweep of src/core2 (Oct 17). A death-forcing test must end the job before the day's work (`endJob` throws once the person has worked that day), so do it right after the world is built, as `office-day-name-head.test.ts` does.
