---
id: views-other-places-voters
title: "M1-13: other places' voters have no views to change; the views engine holds only the town's people"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Roadmap M1-13 asks that other places' voters' views change from their own conditions within real ranges. The views engine (src/core2/modules/views.ts) keeps views for the town's full and counted people only; races elsewhere are counted from each place's 2024 lean (src/core2/electorate-places.ts), which never moves. So nothing about another place's voters changes in a year, and the new M1-13 check fails the clause. Keep a coarse lean per other place, stepped from that place's own conditions (its jobs, prices and the news it gets), read by the races counted there.

**Rules.** One model, two tiers: other places' voters move by the same view rule as the town's people, times their count, never a second simulation. No dice: a place's lean moves from its conditions, and real spreads only check the totals.

**Done when.** In a played year of a place drawn from all 56, other states' coarse leans change from their own conditions with the cause named by record id, races counted there read the moved lean, and the M1-13 command's views clause passes, named with place and seed in the PR body.

**Files.** src/core2/modules/views.ts, src/core2/electorate-places.ts, src/bench/m1-13-check.ts

**Notes.** Found by the M0-M2 lead writing M1-13's command, Oct 24. Blocks roadmap M1-13.
