---
id: realistic-public-budget-lines-per-world
title: "Federal, state and local budget lines open drawn per world"
area: core
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/realistic-budgets
pr: #6474
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:48:12.365Z
---

**What.** Every world opens each government's budget on the published lines: Census state and local finances per resident and the federal fiscal 2025 Treasury statement (budgetFor, src/core2/modules/budgets.ts). Budget screens, ordinance stakes and public pay read those lines. The owner ruled on Oct 27 that every statistic starts realistic, not real, and differs per world.

**Rules.** No dice: each line's offset is seeded generation of the starting world, drawn once per government and line from the world's seed, never an actor's outcome. One rule, all 56 places: every government level reads the same rule from the parameter table; tax rates in law stay.

**Done when.** In two played worlds (buildBenchWorld) of one drawn place with two seeds, every opening budget line differs from the published base and from the other world, named by budget record id, and src/core2/budgets-world.test.ts fails when the lines are the published ones.

**Files.** src/core2/modules/budgets.ts, src/core2/data/parameters.json

**Notes.** TODO
