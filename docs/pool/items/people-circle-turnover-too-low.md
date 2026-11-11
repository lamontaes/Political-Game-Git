---
id: people-circle-turnover-too-low
title: "A person's closest ties almost never change: 2 to 4 percent of a circle is replaced in three years, against about 27 percent in the panel study"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
branch: tiers/circle-workgroups
---

**What.** M0-07's turnover check (src/core2/tooling/m0-07-turnover-check.ts) pools every adult full person's five closest ties on the first day and asks how many are still among their five closest after three played years of the bench world. Mollenhorst, Volker and Flap (2014) found 48 percent of a Dutch adult's discussion partners and helpers still in the network after seven years, about 73 percent after three at a constant rate. The core keeps 95.9 percent in Fair Bluff, North Carolina (3722240, seed 0d1db17e428dddcbdaef4c08a0a53ff62d3f26b034b1c86635fa8d8f29f9db77), 98.3 percent in place 0464650 (seed b15beed42b2bb3154e5e44b4fbcb12766c806013385d86a88518b4879d1787b0) and 97.2 percent in Jamesville, North Carolina (3734320). Ties only fade by half-life, close ties keep being renewed by household and family contact, and new ties start too low to displace them. Seen: the circle list on a person's card, whose closest ties should change over the years.

**Rules.** No dice: a tie leaves someone's circle because of moves, deaths, new jobs, new partners and time apart, read from their own records, and the study's share only checks the town's total.

**Done when.** node --max-old-space-size=8192 --import tsx src/core2/tooling/m0-07-turnover-check.ts passes in the runner's drawn place and two more drawn places named with seeds, with the cause of the low turnover named by line in the PR and the change it makes; the check is unchanged. **On screen.** Nothing yet: filed play-circle-changes-on-screen, which puts it on the People web.

**Files.** src/core2/closeness.ts, src/core2/life.ts, src/core2/data/parameters.json

**Notes.** TODO

Cause found Oct 24 by the M0-M2 lead's probe (Fair Bluff, North Carolina, 3722240, seed above, with a local guard around the three-year payroll crash below):

- Officials dominate the pool. Of 2,251 pooled ties, 2,040 (91%) belong to state and federal officials (tier calendar, id prefix official_), whose five closest ties are all coworker ties; 97% of them stay. Those ties are written once by colleagues() in src/core2/modules/officials.ts (about line 835) when an official is added. Nothing renews a tie while two people still serve together, a colleague leaving office changes nothing, and colleagues() also ties new members to rows that have already ended. Every tie fades by the same factor (src/core2/closeness.ts faded), so a uniform fade never changes the ranking, and an official's circle is frozen whatever the half-life. Officials have no family or friends modeled, so even with renewal their turnover is only the share of colleagues who leave office. Whether an official's circle should hold anyone outside the job is a design question for the government side.
- Residents: 165 ties, 82% kept. Family ties within the household at the start are 100% kept (62 of 62), other family ties 76%. A shared home builds hours up to about 6,400 (closeness 0.986; src/core2/closeness.ts steadyHours and towardSteady; src/core2/people.ts shareHomeTime, about lines 60-98), so someone who moves out needs about 15 years to drop out of the five.
- Ties to the dead stay: 49 pooled ties were to someone who died during the three years, and 43 of them are still among the five closest.
- Separately, the lead observed three-year draws on main stop with "Payroll calendar lacks independently resolved job/person/employer owners" (src/core2/work-attendance.ts:439, through fillInPerson and hireStaff). That is jobs-counted-hire-other-employer-calendar, claimed on claude/counted-hire-own-calendar. That remains a separate failure on those draws. Merger 1 completed an unmodified three-year Agana Heights, Guam run on the integrated branch (see below), so it is not a universal block.
  Files to add: src/core2/modules/officials.ts.

Merger 1 independently completed three unmodified generated years on the integrated #5913 head in Agana Heights, Guam (territory:GU:agana-heights), seed cef964545748a8a0d9b8b0a62199f150c75d8a52512f057eb4cac3a52a49d78a: 390 adults, 1,950 initial ties, 94.2% retained, player 5/5, outside 70.3% to 75.6%; checker exited 1 as required in 161.090 seconds. This confirms the measurement and high-retention gap, not a new independent causal probe or completion of the turnover feature.

Diagnosis (Claude worker, Oct 26, Fair Bluff seed 0d1db17e, 3,722,240; 464 adults, 2,320 circle ties): of the circle ties on day one, 91 are household, 176 family outside the household and 2,053 neither; at three years 95.9% are kept. The 2,053 "other" ties are opening peers (generated coworkers and school acquaintances, `openingPeerHours`, src/core2/closeness.ts): each fades by the same half-life (`closenessOtherHalfLifeDays`), so their order never changes unless a contact adds hours, and the town's contact engine (free-block, state.ts relationship()) renews the same top ties. Only 38 family and 58 other ties left the circle; 1 was a death. So the missing cause is tie formation and replacement: no new coworker, classmate or neighbor ties form after the opening (a new job, a move, a new school year), and shared work or class time credits no hours. A fix that follows the rules adds those formations from the jobs and moves records (a new job brings a workgroup at the casual-friend hours), which touches the jobs and moves engines and the speed budget, so it is bigger than one S/M item: split it by formation source before building. Released unclaimed after about an hour of diagnosis.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: calibrate a plausible range, not the 27% panel figure as a pass mark (OD:12/558).

- Nov 8, merge desk: golden-path M0-07 is red on main for this. Alleghany, California (place key 0600982, seed 988c0ebd1cc36455c63a682e3b0ce2ca58e5a93aea64a4aef921ff53b2ce8f56): 88.3% of circles kept after 3 years, outside the study's 70.3% to 75.6% (`src/core2/tooling/m0-07-turnover-check.ts`), the same on main at 757242caa6 and on #7455's head.

- Nov 9, Tiers: coworker-workgroup source tried and parked (claimed `tiers/circle-workgroups`, nothing shipped). Sprague River, Oregon (4169400, seed a1933cc0f7d3cad3328c1e910e7cbdec830b71cc2c702567adda0097f10a5a22), `m0-07-turnover-check.ts`, share of circles kept after three years; main 90.3%, bar 70.3% to 75.6%. Each variant added a weekly credit of 10 hours (TUNABLE, no source for time with coworkers; BLS is blocked from the cloud container and the time-use companionship figures leave out work) shared among the person's workgroup (`workgroupsAt`, about `openingCoworkerGroupSize` people), in `modules/people.ts` beside `shareHomeTime`:
  1. Even split, group count `ceil(staff / 8)`: 12.4%.
  2. Same, group count a power of two (a group splits in two as the staff doubles): 39.6%.
  3. Same as 1 with the group count fixed per employer when its staff is first read: 12.7%.
  4. Same as 3, hours shared by existing closeness plus a base: 12.6%.
     Diagnostic on variant 2, by where a day-one circle member is after three years (kept of total): same workgroup 473 of 529; same employer but another group 177 of 1,139; elsewhere 122 of 274; dead 41 of 113. On main (no credit) the 2,055 members were 94% coworker ties from the opening workgroups (91% kept), 6% family, and no neighbor, friend or classmate ties exist in any adult's five closest.
     Reading: with equal hours every mate in a group climbs to the same closeness, so which five are closest is arbitrary, and the group grows as the staff is filled in; real leavers and deaths are only about 19% of day-one members. Any single hours value would steer to the range. Next, not tried: pair hours read from the jobs engine's overlapping attended shifts (no parameter), then neighbors through the moves records and friends from groups.

Released by next (2026-11-10): no push to tiers/circle-workgroups since 2026-11-09 03:13 UTC, more than twice its 4-hour time box. Continue on branch tiers/circle-workgroups.
