---
id: tests-circumstance-player-dies-mid-year
title: "circumstance.test fails when the played person dies inside the year: the player clock refuses a dead person"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/director-circumstance-test-player-dies
pr: #6402
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T20:38:14.299Z
---

**What.** On the random seed of #6373's unit job, 66242769da24124d44c495bee555841f8b0fede6, the circumstance test failed after the merge to main. A person it played died partway through the year, and the player clock threw on the next resume: Controlled person is no longer alive. The test then fails on any draw where a played life ends, which is a death the simulation decided, not a defect in the scenes. The played year should end with the person's life, and the test should judge the scenes that came before.

**Rules.** One rule, all 56 places: a death can come in any drawn place, so the test must hold on every draw, never by picking a seed that avoids one. No dice: the death is the health engine's decision, and the test reads it rather than rerolling the world.

**Done when.** With GOLDEN_PATH_SEED=66242769da24124d44c495bee555841f8b0fede6, src/director/circumstance.test.ts passes in the drawn places it names, and it fails on clean main with the clock's death error; the test still throws any other error from the player clock.

**Files.** src/director/circumstance.test.ts

**Notes.** TODO
