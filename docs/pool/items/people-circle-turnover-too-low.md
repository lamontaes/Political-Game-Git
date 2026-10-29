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
---

**What.** M0-07's turnover check (src/core2/tooling/m0-07-turnover-check.ts) pools every adult full person's five closest ties on the first day and asks how many are still among their five closest after three played years of the bench world. Mollenhorst, Volker and Flap (2014) found 48 percent of a Dutch adult's discussion partners and helpers still in the network after seven years, about 73 percent after three at a constant rate. The core keeps 95.9 percent in Fair Bluff, North Carolina (3722240, seed 0d1db17e428dddcbdaef4c08a0a53ff62d3f26b034b1c86635fa8d8f29f9db77), 98.3 percent in place 0464650 (seed b15beed42b2bb3154e5e44b4fbcb12766c806013385d86a88518b4879d1787b0) and 97.2 percent in Jamesville, North Carolina (3734320). Ties only fade by half-life, close ties keep being renewed by household and family contact, and new ties start too low to displace them.

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
