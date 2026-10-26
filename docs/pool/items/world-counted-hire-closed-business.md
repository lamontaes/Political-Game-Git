---
id: world-counted-hire-closed-business
title: "A counted worker is hired into a business that has closed, and the next fill-in of that worker stops the world"
area: world
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/counted-hire-closed-business
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T08:33:00.748Z
---

**What.** In Johnstown, Ohio (key 3939340, drawn from all 56 by seed band-2026-10-26), on main 9bf8ccd9c2 with the open speed changes merged, the TV news outlet organization:press:television:0:jurisdiction_44255e80577bd2c8 closed on August 1, 2027, the day the jobs engine had posted an opening there. The weekly round still filled that opening from the counts: person_015623cde2517aca got job:position:organization:press:television:0:jurisdiction_44255e80577bd2c8:2027-08-01:1:person_015623cde2517aca the next day. On August 9 the press's staff refresh filled that worker in, handing back a job at a closed business, and the core stopped the run with 'A person can only hold their own recorded job.' A full person's hire already refuses a closed business (src/core2/modules/jobs.ts, 'A closed business hires no one, though its opening may still be listed'); hireCounted, the counted hire, has no such check.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person. Wire to the world: a closed business pays and hires no one. A played world never stops on a record the engines wrote.

**Done when.** A test opens a position at a business in a drawn town (place and seed named), closes the business, and runs the weekly rounds: on main a counted worker is hired into it, with the fix no one is; in the played world (buildBenchWorld) Johnstown, Ohio, seed band-2026-10-26, with the open speed changes merged, runs its third year to the end; and the jobs tests pass.

**Files.** src/core2/modules/jobs.ts

**Notes.** Found Oct 26 by the speed lead measuring the third-year band. Main alone runs Johnstown's three years (132.6, 358.1 and 596.3 s): the open speed changes give the town a different history, one that reaches this. #5972, #5979, #6010 and #6043 also change jobs.ts, away from hireCounted.
