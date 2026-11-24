---
id: release-new-game-check-one-job
title: "One check holds a merge: a new game opens in a drawn town and plays a few weeks without crashing"
area: release
kind: feature
priority: 2
size: S
status: done
claimed-by: lane-5/new-game-check
pr: #7141
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-03T21:58:11.733Z
---

**What.** The owner ruled on Nov 3 that one check holds a merge: a new game opens and runs briefly without crashing, and nothing else holds a merge. No single job does that today; the validate aggregate runs the repository, guards and unit jobs, none of which opens a game. A player who downloads a build that cannot open a new game hits the worst failure there is, so this is the one check that must stand before every merge.

**Rules.** Wire to the world: the check opens a real game through the bench's own request handler in a town drawn from all 56 places (One rule, all 56 places), prints the replay number first, and replays a failure on that town against main to see whose fault it is.

**Done when.** A workflow job named new game runs on every pull request, draws a town from all 56, prints its replay number and place, opens a new life and plays four weeks through the same routes the screen calls, and fails with the route and error on any refusal, stuck stop or crash; scripts/new-game-check.test.ts proves each failure is caught, and three drawn towns pass locally.

**Files.** scripts/new-game-check.ts, scripts/new-game-check.test.ts, .github/workflows/new-game.yml, package.json

**Notes.** TODO
