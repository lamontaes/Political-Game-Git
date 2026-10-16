---
id: play-world-panels-served
title: "The bench serves every world panel (building, law costs, bank, evictions, owners, national votes)"
area: play
kind: feature
priority: 3
size: S
status: in-pr
claimed-by: claude/world-panels-served
pr: #4701
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T10:37:55.443Z
---

**What.** `worldPanels` (bench/economy.ts) returns only national, region, turnover, bank, evictions and owners. The readers `buildingPanel` and `lawCostsPanel` and the other two new ones (world-panels.ts), and the board's meetings and votes (the national panel), are served by no route or screen. Add them to `worldPanels`, add a route, and show them.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** Each panel opens from the play screen in a drawn place and shows record data, with a test in src/bench that the route returns it.

**Files.** src/bench/economy.ts, src/bench/handler.ts, src/bench/play.mjs

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.
