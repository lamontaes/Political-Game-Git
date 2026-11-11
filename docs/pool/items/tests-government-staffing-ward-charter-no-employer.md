---
id: tests-government-staffing-ward-charter-no-employer
title: "The government law test finds no employer reached by administration staffing in a ward-charter town"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** src/core2/law-wiring-government.test.ts fails on seed 446eaae155bdacc270446225a696c32454dda4b0 at its fifth attempt, the ward-charter fallback place 3050200: administration staffing applied to an employer, expected more than 0 and got 0. The first four drawn places had at-large councils, so the test fell back to a charter town with ward seats. Whether the town has no administration employer to staff, or the staffing reach misses one it has, is not yet known. Guards: a raised administration staffing line pays an employer in a ward-charter town, on the budget the player reads.

**Cause.** Needs cause. Looked at src/core2/law-wiring-government.test.ts and the staffing reach in src/core2/law-reach/group-a-staffing.ts: whether place 3050200 holds an administration employer that the reach misses, or none at all, was not read. Measured: seed 446eaae155bdacc270446225a696c32454dda4b0, ward-charter place 3050200.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test. Never weaken a test to get green: if the place truly has no administration employer, the test draws again and names the place it passed over; if the reach misses one, fix the reach. One rule, all 56 places.

**Done when.** A second session runs src/core2/law-wiring-government.test.ts on seed 446eaae155bdacc270446225a696c32454dda4b0 and on three fresh seeds and sees every run pass, each naming its place and the employer the staffing reached by record id. The cause is named by record id in the item Notes.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-government.test.ts, src/core2/law-reach/group-a-staffing.ts

**Notes.** TODO
