---
id: core-speed-gc-churn
title: "Garbage collection is 21 percent of a dense town's year (52 of 251 seconds): find what allocates per day"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b, 251 seconds), the garbage collector takes 52 seconds, the largest single line. A trace of the same year shows 4,539 young-generation scavenges taking 32 seconds, about 7 ms each, so many objects survive each one, and the heap peaks near 2.5 GB. Take a sampling heap profile of the year, name the three biggest allocators by file and function, and change each to reuse its storage or act on the day something changed. A larger young generation (--max-semi-space-size=128) ran the year in 169 seconds against 182 to 214, which is worth setting where the play process starts, but is not the fix.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. Replace, never layer: the wasteful path is deleted, not kept beside the new one.

**Done when.** A sampling heap profile of npm run speed:year -- --seed m7b --exclusive in the played world before and after names the three allocators and shows garbage collection below 10 percent of the year, with the year faster by the same measure and the golden-path suite and the money-balance tests still passing.

**Files.** src/core2/state.ts, src/core2/journal-state.ts, src/core2/module-state.ts, src/core2/life.ts

**Notes.** TODO

Oct 20 (claude/speed-score-terms): done from the note above. `scoreOffers` now copies each offer's reason terms (the binding, its arguments, its source ids) only for an actor whose reasons are saved (the player, the focus, a controlled person, anyone while the observer is on) or when a caller asks for them (`chooseAct`'s original-answer capture); everyone else keeps each reason's number and no copy. Same sampling profile, seed m7b: `scoreOffers` 1.25 -> 1.07 GB; the year's total 58.2 -> 58.4 GB is inside the run-to-run spread (about 1 GB), so the change is small. Saved-trace (33), choice-qualifiers (11), event-appraisal-hooks (21) and business (14) tests pass.
