---
id: core-speed-opelika-year-memory-growth
title: "Opelika, Alabama's year at the sample size takes about 27 minutes and its heap grows from 0.9 GB in July to 4.9 GB by October"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5787
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A played year of Opelika, Alabama (place 0157048, seed op1) at the sample size, buildBenchWorld two-level, took about 27 minutes on a 4-core container, against the two-minute rule. The first six 30-day months ran in 15 to 23 seconds each; from August the live heap after collection grows from about 0.9 GB to about 4.9 GB by October and the months slow down, and a vitest run of the year runs out of memory at a 5 GB heap. Clean main showed the same curve, so it is not from the change that found it. Find what accumulates from August (a table, an index or a history kept per day) and make it act on the day something changed or drop what nothing reads.

**Rules.** Speed: a town's game year runs in under two minutes and no change makes it more than 20 percent slower; never scan or keep a whole history every day. Replace, never layer: the growing store is fixed at its source, not trimmed after.

**Done when.** A sampling heap profile of the Opelika year in the played world (buildBenchWorld, seed op1) before and after names the record that grows by file and function, the year runs in under two minutes with its heap flat after August, and npm run speed:year on the same seed is no slower; the PR names the place, seed and measurements. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/state.ts, src/core2/module-state.ts

**Notes.** Found working world-census-scale-closures-rise (PR #5553), whose pinned Opelika case plays 220 days because of it.

Sent back 2026-10-23 from PR #5787 (branch claude/opelika-memory): The table explicitly leaves the under-two-minute flat-heap year unmet and speed:year unrun; bind the retention slice separately so fallback completion cannot close the unfinished memory item; finish on that branch, merge main into it first.

Oct 25 (speed lead), on main 01f5cd4715, Opelika (key 0157048, seed op1), one process on a four-core container, month by month with the live heap after a full collection: the year takes about 404 s, not 27 minutes. Months one to six run 9 to 16 s with the heap 0.64 to 0.84 GB. From the month to August 18 they slow: 32, 45, 53, 55, 71 and 76 s, with the heap 1.0 to 2.2 GB. What grows is the kept log (`core.durableLog`): 16,387 records in July, 380,070 by January, about 29,000 `person.acted` and 13,000 to 57,000 `person.weighed` a month, plus 8,000 `cause.shared`. The cause: from August 6 the player (born 2007) takes up a cause and joins cause groups, and each group member gets a "met-in-group" tie with the player (16 to 61 new ties a day, `cause: met-in-group`, source `membership:organization_…`). Any tie change with the player adds the other person to `focusPersonIds` for good (state.ts, the relationship writer), so the focus set goes from 47 to 264 in that month and 327 by October, and every focus person's acts and reasons are kept. In the ninth month's profile (57.8 s), the drives engine takes 16.6 s, mostly the cause-group offers (`groupKnown` 6.15 s; filed `core-speed-cause-group-offers-per-topic`). The rest is the same runaway cause activity as Bedford (people-cause-holder-activity-calibrated, people-drives-cause-acts-pull-less). Open questions for the people area: whether meeting a group's members should tie the player to all of them at once, and whether a tie that weak makes someone a person the player deals with (the owner's Oct 11 rule on whose reasons are saved).
