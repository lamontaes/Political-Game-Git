---
id: play-golden-path-panel-in-dev-mode
title: "M0-05: no screen shows the golden path and world panel; the bench serves it only as /api/progress and /api/world-panels"
area: play
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-dev-panel
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T04:44:44.871Z
---

**What.** Roadmap M0-05 is 'The golden path and world panel'. Its command (src/bench/m0-check.ts M0-05) passes on main b09ba675cd in Sarben, Nebraska: steps 1 to 11 reachable with evidence, and the world pieces each say whether they run. But no screen draws it: src/bench/play.mjs and dev.mjs never call /api/progress or /api/world-panels, so the owner cannot see it in the bench. Show the steps and the world pieces in Dev mode (the owner's test bench), drawn from benchProgress and worldPanels record data.

**Rules.** No hand-written player text: the panel shows record data and control names from src/bench/progress.ts and src/bench/economy.ts, never new prose. Wire to the world: it reads the played world's own records in a drawn place.

**Done when.** Dev mode shows each golden-path step with its status and evidence record id, and each world piece with its running modules, in a place drawn from all 56; a browser check in src/bench opens it and a screenshot with place and seed is in the PR body.

**Files.** src/bench/dev.mjs, src/bench/dev.html, src/bench/handler.ts

**Notes.** Found by the M0-M2 lead, Oct 24. Blocks roadmap M0-05's flag.
