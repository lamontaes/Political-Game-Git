---
id: core-speed-business-foundings
title: "The business engine's foundings pass rebuilds the town's pay table and sorted people for every market, 4 percent of a dense town's year"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:08:03.624Z
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b), foundings in the business engine takes 9.0 of 251 seconds, 3.6 percent. For every market it rebuilds the table of every job's monthly pay and sorts every person in the world by id, though a founding returns from the function, so nothing changes between the markets that go on. Build the pay table and the sorted list once, when the first market needs them.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. Replace, never layer: the per-market rebuild is removed, not kept beside a cache.

**Done when.** In the played world (buildBenchWorld), a CPU profile of npm run speed:year -- --seed m7b --exclusive before and after shows foundings below 2 percent of the year, and the business tests, including a founding in a drawn place, pass unchanged.

**Files.** src/core2/modules/business.ts

**Notes.** TODO

**Result (Oct 20).** The pay table and the id-sorted people list are built once, when the first market needs them. Typecheck, eslint and the four business tests (36) pass. The before-and-after CPU profile on seed m7b was not taken in this session; the CTO or a speed run should confirm foundings below 2 percent.

**Measured (Oct 20, seed m7b, Long Hill, CPU profile, inclusive time of foundings).** Before this item: 10.17 s of 259.7 s (3.9 percent). With the pay table and sorted people built once: 9.61 s of 257.3 s (3.7 percent), so that rebuild was not the main cost. The profile showed makeIsoDate and epochDayOf (parsing birth dates for every person in every market) as the largest lines; ages are now computed once per pass: 7.33 s of 264.1 s (2.8 percent). Still above the 2 percent target. Next biggest inside foundings: traitLean and kindLean in choice.ts (0.68 s, 0.46 s), countedMember (0.55 s), parameter lookups (0.51 s), founderSavings (0.46 s). Left open for a follow-up.
