---
id: people-back-figures-draw
title: "People seen from behind fail to draw (No such figure)"
area: people
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/people-back-figures-draw
pr: #6555
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T06:01:23.578Z
---

**What.** drawnFigure (src/bench/figure-hair.ts) looks figures up in art/people-engine/v2/index.json only, so the 24 figures seen from behind (figures-back.json, chosen for crowds facing away) throw No such figure at the figure route and show as broken pictures in play; scripts/people/scene-shots.ts crashes on them.

**Rules.** One drawing path for every figure; replace, never layer.

**Done when.** figure-hair.test.ts draws every figure in figures-back.json with and without hair (fails with No such figure when the fix is undone); scene-shots renders the plated crowd rooms in a drawn town without the error.

**Files.** src/bench/figure-hair.ts, src/bench/figure-hair.test.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6555 merged (the done flip failed while branch protection refused the flip job's push).
