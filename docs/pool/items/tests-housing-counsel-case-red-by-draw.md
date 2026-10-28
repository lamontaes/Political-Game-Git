---
id: tests-housing-counsel-case-red-by-draw
title: "The right to counsel case in the housing and credit law test fails on main where no eviction reaches a hearing"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main at d57af90e89 (Oct 28, 21:00 UTC), src/core2/law-wiring-housing.test.ts fails its counsel case with GOLDEN_PATH_PLACE_KEY=3224900 GOLDEN_PATH_WORLD_SEED=fb34cd640b03c792fc9d97aa72da89621c42cbdb263ea8c756049a8438779273 (Fernley, Nevada, drawn by the unit job on PR 6676): 'no eviction hearing had a lawyer' and 'no hearing's lawyer was paid through the journal with an applied row for its household'. The law is in force but no eviction case reached a hearing in the window, so the statute had nobody to bind. The same draw also fails the cap case (tests-loan-cap-case-red-by-draw). The law-wiring checker already counts eviction cases filed as the law's subjects (SUBJECTS in scripts/law-wiring/check.ts, PR 6676).

**Rules.** No dice: never retry a seed to get green. One rule, all 56 places. Ask why: a place with no eviction filed is passed over with that reason by record, the way the checker grades it; a place with a filed case and no lawyer is a real failure.

**Done when.** With the pinned place and seed above, the counsel case either passes over Fernley, Nevada naming that no eviction case was filed (by the housing engine's cases table) and checks the next drawn place, or passes; and it passes on three fresh random seeds named in the PR body.

**Files.** src/core2/law-wiring-housing.test.ts

**Notes.** TODO
