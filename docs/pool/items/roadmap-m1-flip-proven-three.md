---
id: roadmap-m1-flip-proven-three
title: "Roadmap M1-01, M1-02 and M1-10 read passes: true, with their runs and bench screenshots"
area: core
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The M0-M2 lead's baseline on main b09ba675cd ran every M1 command in the place the golden-path runner draws for it. M1-01 (laws in force), M1-02 (the national economy and central bank) and M1-10 (political views) passed, and their tests cover their whole spec text. This item flips those three flags with each run and a bench screenshot, so the owner can see what of M1 is finished.

**Rules.** Wire to the world: each flag flips only on its command passing in a place drawn from all 56 and the spec played in the bench. Never edit a spec's test text; only passes changes.

**Done when.** docs/roadmap/features.json reads passes: true for M1-01, M1-02 and M1-10; the PR body names each command's place and full seed, its output, and a bench screenshot of the spec played in that place.

**Files.** docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m1-laws-budgets-flags, roadmap-m1-economy-flags and roadmap-m1-people-politics-flags (CTO branch).
