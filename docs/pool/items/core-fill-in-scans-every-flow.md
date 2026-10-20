---
id: core-fill-in-scans-every-flow
title: "Filling in a household scans every counted flow, 2,400 of 2,600 of them per-household rents, so a dense town spends 15 percent of its days on it (Lodi, New Jersey)"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/fill-in-flow-scan
pr: #5051
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T13:40:05.633Z
---

**What.** `releaseResidentHousehold` in `src/core2/modules/residents.ts`, which runs every time a counted person is filled in, looked at every counted flow to find the ones that pay or bill that household. In Lodi, New Jersey (seed 8b410b7e1dcf) 2,409 of 2,602 flows are one household's own rent, which a fill-in finds by id, and only about 70 flows name jobs or contracts. A profile of 60 played days put 4.5 seconds in this one function, about 15 percent of the days' time. The scan should visit only the pooled wage, retirement and purchase flows, in the flows' order, and take the household's rent by its id.

**Rules.** Speed: a town's game year runs under two minutes and no change makes it more than 20 percent slower; never scan the whole world every time something changes. Replace, never layer: the full scan is deleted, not kept beside the list. One model, two tiers: a filled-in household takes back the same shares as before.

**Done when.** In the played world (`buildBenchWorld`, Lodi, New Jersey with seed 8b410b7e1dcf, 90 days) the state after the days is identical to before the change, shown by people, cash totals and journal sequence, and the days take less time on one machine; `src/core2/fill-in-pooled-flows.test.ts` states that the pooled list is exactly the flows a full scan would act on, in a drawn place.

**Files.** src/core2/modules/residents.ts

**Notes.** Found Oct 18 (claude/fill-in-flow-scan) profiling the slowest place of an all-places year. Measured on one 4-core container, one process: 90 days from the start took 50.8 s before and 43.3 s after (15 percent), with the same fingerprint (2,231 people, journal sequence 46171, hash 88c7e140ef924608 of people, cash, organizations' cash, journal sequence and jobs). A flow that is replaced under its own id is read as it stands now; a flow that gains a pooled field under an old id is not seen, and nothing does that today.
