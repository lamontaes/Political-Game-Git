---
id: words-victory-night-test-finds-its-race
title: "The victory-night test finds a race and follows whoever wins it"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: lane3/victory-night-race
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T18:25:24.961Z
---

**What.** victory-night.test.ts was red on main by draw (seed 8257473f737a957d: none of 16 places staged a night). It tried only the races open the first week it found one, filed residents who could not run or were already running, and watched only its own filers, so a resident who filed on their own and won or came second threw the draw away.

**Rules.** Never loosen a test: what it checks of the scene is unchanged.

**Done when.** On the seed that failed the test passes: a winner's night is composed from the count with the runner-up as the opponent.

**Files.** src/director/victory-night.test.ts

**Notes.** TODO
