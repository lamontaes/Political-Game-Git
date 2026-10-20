---
id: core-speed-business-foundings
title: "The business engine's foundings pass rebuilds the town's pay table and sorted people for every market, 4 percent of a dense town's year"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/speed-foundings
pr: #0
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:04:36.343Z
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b), foundings in the business engine takes 9.0 of 251 seconds, 3.6 percent. For every market it rebuilds the table of every job's monthly pay and sorts every person in the world by id, though a founding returns from the function, so nothing changes between the markets that go on. Build the pay table and the sorted list once, when the first market needs them.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. Replace, never layer: the per-market rebuild is removed, not kept beside a cache.

**Done when.** In the played world (buildBenchWorld), a CPU profile of npm run speed:year -- --seed m7b --exclusive before and after shows foundings below 2 percent of the year, and the business tests, including a founding in a drawn place, pass unchanged.

**Files.** src/core2/modules/business.ts

**Notes.** TODO
