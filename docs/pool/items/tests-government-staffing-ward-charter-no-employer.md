---
id: tests-government-staffing-ward-charter-no-employer
title: "The government law test finds no employer reached by administration staffing in a ward-charter town"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/law-wiring-government.test.ts fails on seed 446eaae155bdacc270446225a696c32454dda4b0 at its fifth attempt, the ward-charter fallback place 3050200: administration staffing applied to an employer, expected more than 0 and got 0. The first four drawn places had at-large councils, so the test fell back to a charter town with ward seats. Whether the town has no administration employer to staff, or the staffing reach misses one it has, is not yet known.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test. Never weaken a test to get green: if the place truly has no administration employer, the test draws again and names the place it passed over; if the reach misses one, fix the reach.

**Done when.** The cause is named by record id in the item Notes, and src/core2/law-wiring-government.test.ts passes on seed 446eaae155bdacc270446225a696c32454dda4b0 and on three fresh seeds, each run naming its place and the employer the staffing reached by record id.

**Files.** src/core2/law-wiring-government.test.ts,src/core2/law-reach/group-a-staffing.ts

**Notes.** TODO
