---
id: world-territory-village-opens-with-no-employers
title: "world-game.test fails on main: an island-area village (territory:AS:faleasao) opens with no employers, so no one has a job and newGame throws"
area: world
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/territory-employers
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:51:04.582Z
---

**What.** src/core2/world-game.test.ts draws its place from the fixed seed 'world-game' and has failed on main since PR #5322 (territory-places-census, merge 879ce4651e; it passes at 879ce4651e^1). The test's place is territory:AS:faleasao, and after #5322 gave island villages a Census sourceGeoid and their real size, the opening builds 42,425 residents but no organizations and no jobs: the employment receipt shows employmentTarget 4867, supportedSourceWeight 0 and every role omitted with 'No recorded employer identity'. newGame then throws 'No eligible recorded adult worker in territory:AS:faleasao' at src/core2/tooling/generated-world.ts:106, so a player choosing an island village cannot start a game.

**Rules.** One rule, all 56 places: the fix names no place; island areas get employers from the same town-employment and local-business-count code as any town, with the island areas' own counts where the Census has them and an estimate marked with its source where it does not (estimate, never UNKNOWN). Wire to the world: the jobs and employers must exist in the generated world and pay through the journal.

**Done when.** Running npx vitest run src/core2/world-game.test.ts passes in buildBenchWorld/newGame for territory:AS:faleasao and in two other island-area villages and three random places, the opening for each shows organizations and jobs for at least 60 percent of its employment target by receipt, and newGame no longer throws; record ids of the employers named in the PR body.

**Files.** src/simulation/local-business-counts.ts, src/simulation/living-world/town-employment.ts, src/core2/opening-employment.ts, src/core2/world-game.test.ts

**Notes.** Bisected Oct 20 on first-parent history: cb66bc9c96 passes, 879ce4651e^1 passes, 879ce4651e (#5322) fails. Why the employers are missing is not yet traced: the opening has zero organizations, so look at where town businesses and workplaces are written (town-businesses.ts, localBusinessSupplyFor) for a place with a sourceGeoid in an island area (FIPS 60, 66, 69, 72, 78 are not in the county tables). Not caused by the territory-residents change (#5167); that commit passes.
