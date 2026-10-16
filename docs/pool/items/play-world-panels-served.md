---
id: play-world-panels-served
title: "The bench serves every world panel (building, law costs, bank, evictions, owners, national votes)"
area: play
kind: feature
priority: 3
size: S
status: done
claimed-by:
pr: #4701
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `worldPanels` (bench/economy.ts) returns only national, region, turnover, bank, evictions and owners. The readers `buildingPanel` and `lawCostsPanel` and the other two new ones (world-panels.ts), and the board's meetings and votes (the national panel), are served by no route or screen. Add them to `worldPanels`, add a route, and show them.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** Each panel opens from the play screen in a drawn place and shows record data, with a test in src/bench that the route returns it.

**Files.** src/bench/economy.ts, src/bench/handler.ts, src/bench/play.mjs

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4701 (branch claude/world-panels-served): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4701 (branch claude/world-panels-served): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
