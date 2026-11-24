---
id: play-figure-stands-centered-in-small-rooms
title: "The player's figure stands where a small room's floor gives space, with margin on all sides"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/people-hero-margins
pr: #6427
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T22:15:31.918Z
---

**What.** In a played life (Abanda, Alabama, January 22 to 28, 2025) the bedroom draws the player at the far left edge with the head close to the top of the picture. Cause: the close-up bedroom-plain hero spot (x 18, y 72, horizon 26, 0.95 percent per meter in art/backdrops/staging.json) makes the adult 75 percent of the picture tall; play-stop-38 only keeps 2 percent head room and moves a figure in from the sides, which leaves it tight against the edge.

**Rules.** Serves LAW.md section 2, People in rooms and figures (plain poses, figures drawn whole) and the play-first browser check (people and props touching or overlapping). One placement rule for room figures, no per-scene nudges; replace, never layer.

**Done when.** In a drawn place's bedroom at 1440x900 the player's figure box shows margin on all four sides (at least 4 percent of the picture at the head and at the left) and a test in src/bench/framing.test.ts reads every hero spot's figure box against the frame and fails below those margins; before and after screenshots with place and seed.

**Files.** src/bench/whole-figures.ts, art/backdrops/staging.json, src/bench/framing.test.ts

**Notes.** From the play-first-07 check, 2026-10-27 (lane agent 3). Seen on main after #6240. Likely fix: a hero spot farther back and more central in the close-up rooms, or a head-room and side margin rule larger than the current 2 percent.
