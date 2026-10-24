---
id: play-bench-card-intercepts-calendar-pointer
title: "Keep the player card from blocking Calendar pointer clicks"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Fresh real-browser run on main-integrated #5869 head 03a8dc54d1: New game with empty Place, Skip opening, then Calendar pointer click times out because section#card intercepts pointer events. South Windham Maine; seed 3c088861-ddf4-4043-be35-04578d107721; viewport 1440x1000.

**Rules.** Wire to the world: verify the actual bench in a fresh world drawn from all 56 places using real pointer and keyboard controls; preserve the player card and Calendar actions. Diagnose on current main; do not bypass hit testing with forced or DOM clicks.

**Done when.** A fresh drawn-place game at 1440x1000 opens Calendar with an ordinary pointer click after Skip opening, keyboard access also works, and an inspected native screenshot plus full seed/place and no page errors are recorded.

**Files.** src/bench/play.css, src/bench/play.html, src/bench/play.mjs

**Notes.** Merger 1 discovered 2026-10-24 while checking #5869; unrelated to its docs-only diff. Playwright log: section#card.panel.me intercepts pointer events on #rings [data-tab=calendar].
