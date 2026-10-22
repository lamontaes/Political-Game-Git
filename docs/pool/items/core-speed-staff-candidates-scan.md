---
id: core-speed-staff-candidates-scan
title: "An official's staff review scans every person in the world for candidates: 7 of a dense town's 186 seconds"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** staffCandidates (src/core2/modules/staff.ts) walks peopleInOrder over the whole world for each official at each staff review, reading custody, age, work today and every open commitment's pay per person, then the town's counted pool. In Long Hill, Connecticut (seed m7b, npm run speed:year -- --seed m7b --exclusive with node --cpu-prof), staffReview's inclusive time grew from 0.9 s to 7.0 s of the year between main on Oct 20 at 14:29 (25daaa399e) and main on Oct 22, and staffCandidates from 0.4 s to 4.2 s. Read the candidates from indexes: the official's known people and family by id, and the town's residents by place, instead of every person.

**Rules.** Speed: never scan the whole world each day; use indexes or act on the day something changed. No dice: the same people are candidates with the same reasons, by record id.

**Done when.** In Long Hill, Connecticut (seed m7b), a CPU profile of the played year shows staffReview's inclusive time back near 1 s, the staff hired in the year are the same people by record id before and after, and staff.test.ts passes.

**Files.** src/core2/modules/staff.ts

**Notes.** TODO
