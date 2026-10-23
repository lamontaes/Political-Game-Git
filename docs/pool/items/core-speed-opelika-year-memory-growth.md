---
id: core-speed-opelika-year-memory-growth
title: "Opelika, Alabama's year at the sample size takes about 27 minutes and its heap grows from 0.9 GB in July to 4.9 GB by October"
area: core
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/opelika-memory
pr: #5787
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T07:12:50.915Z
---

**What.** A played year of Opelika, Alabama (place 0157048, seed op1) at the sample size, buildBenchWorld two-level, took about 27 minutes on a 4-core container, against the two-minute rule. The first six 30-day months ran in 15 to 23 seconds each; from August the live heap after collection grows from about 0.9 GB to about 4.9 GB by October and the months slow down, and a vitest run of the year runs out of memory at a 5 GB heap. Clean main showed the same curve, so it is not from the change that found it. Find what accumulates from August (a table, an index or a history kept per day) and make it act on the day something changed or drop what nothing reads.

**Rules.** Speed: a town's game year runs in under two minutes and no change makes it more than 20 percent slower; never scan or keep a whole history every day. Replace, never layer: the growing store is fixed at its source, not trimmed after.

**Done when.** In a played world (buildBenchWorld, Opelika, Alabama, seed op1, default size), a sampling heap profile of the year before and after names the record that grows by file and function, the year runs in under two minutes with its heap flat after August, and npm run speed:year on the same seed is no slower; the PR names the place, seed and measurements.

**Files.** src/core2/state.ts, src/core2/module-state.ts

**Notes.** Found working world-census-scale-closures-rise (PR #5553), whose pinned Opelika case plays 220 days because of it.

Measured Oct 21 (claude, claude/opelika-memory), partly fixed, item stays open. Opelika, Alabama (0157048, seed op1), default size, one year in one process: month by month the live heap after collection runs 633, 677, 716, 755, 810 and 887 MB through July 19, then 1,514 (Aug 18), 3,309 (Sep 17) and 3,976 MB (Oct 17); months take 17 to 25 s until July and then 67, 142 and 184 s. The module tables do not explain it (news.heard +70,000, speech.retellings +11,000, campaigns.causes +11,000, views.stances +9,000 rows by October). The growth is the player's circle: the focus set was 51 people on July 19, 176 on Aug 8, 335 on Aug 28 and 368 on Sep 17, because everyone the player has a relationship with is added (state.ts relationship change: `core.focusPersonIds.add`), the campaign season. A focus member's every activation keeps all its options' scores and reasons in the durable log until `circleDecisionDetailDays` (30) passes. A sampling heap profile that keeps only what is still live, run over the 60 days from July 9, puts 1,123 MB of the 2,002 MB growth in `choice.ts scoreOffers` (called from `life.ts activate`), the rest in native array pushes and `decisionFromScores`. Setting `circleDecisionDetailDays` to 7, the low end of its spread, cuts the growth over the same 60 days to 891 MB (scoreOffers 384 MB); `condense-decisions.test.ts` passes. A year is still far over the two-minute rule, so the Done when is not met: the heap still grows with the circle (about 15 MB a day at 7 days), and activations of 368 circle members are scored daily. Next: keep only the chosen option's reasons and a compact trace for a circle member who is not the player (the player's own keep the full set), and count scored offers per day by actor class.
