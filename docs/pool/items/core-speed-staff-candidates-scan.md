---
id: core-speed-staff-candidates-scan
title: "An official's staff review scans every person in the world for candidates: 7 of a dense town's 186 seconds"
area: core
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** staffCandidates (src/core2/modules/staff.ts) walks peopleInOrder over the whole world for each official at each staff review, reading custody, age, work today and every open commitment's pay per person, then the town's counted pool. In Long Hill, Connecticut (seed m7b, npm run speed:year -- --seed m7b --exclusive with node --cpu-prof), staffReview's inclusive time grew from 0.9 s to 7.0 s of the year between main on Oct 20 at 14:29 (25daaa399e) and main on Oct 22, and staffCandidates from 0.4 s to 4.2 s. Read the candidates from indexes: the official's known people and family by id, and the town's residents by place, instead of every person.

**Rules.** Speed: never scan the whole world each day; use indexes or act on the day something changed. No dice: the same people are candidates with the same reasons, by record id.

**Done when.** In Long Hill, Connecticut (seed m7b), a CPU profile of the played year shows staffReview's inclusive time back near 1 s, the staff hired in the year are the same people by record id before and after, and staff.test.ts passes. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/modules/staff.ts

**Notes.** TODO

Oct 25 (speed lead), on main 01f5cd4715: a CPU profile of Long Hill, Connecticut's played year (seed m7b, key 0943580, the world `npm run speed:year -- --seed m7b` plays) puts `staffReview` at 0.95 s inclusive of 130.2 s (`staffCandidates` 0.43 s), back near the 1 s this item asks for, after #5835 (place index, 6.9 to 5.0 s) and the later cuts. `staff.test.ts` passes on main (2 of 2, with a 4 GB test heap; see tests-world-tests-outgrow-worker-heap). The same-staff check was #5835's (171 rows identical by record id). Recommend the CTO mark it done; no PR during the play-first freeze.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `core-speed-staff-candidates-indexed`; close into it and carry any line it lacks there. (done)
