---
id: gov-played-world-counted-voters-township-board
title: "Golden path M0-13: counted voters cast no votes in a South Dakota township board race (Mansfield)"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/township-counted-votes
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:20:20.012Z
---

**What.** The golden-path-year job on PR 6037 failed M0-13's assertion that counted voters vote in local races, in Mansfield, South Dakota (place key 4640580, seed c9aba455b21b5ac25b8c9611a32aa95ff6460c8d08e9bb1c89c6c35a790b9410). Clean main 6486df4197 fails the same way in that draw: 2 of 2 local races decided in the year were township board member races with no counted votes, although the town has 55 counted adults. The earlier fix for Randall, Kansas (gov-played-world-counted-voters-red, PR 5865) does not reach a township board race, so find why the counted tier gets no choice there and fix it at the root.

**Rules.** One model, two tiers: a counted voter group is read by the same voting rule as a full person, times its count. One rule, all 56 places: no state or township named in logic.

**Done when.** tests/golden-path/played-world.node-test.ts passes M0-13 in Mansfield, South Dakota (key 4640580, seed c9aba455b21b5ac25b8c9611a32aa95ff6460c8d08e9bb1c89c6c35a790b9410) and in two more places drawn from all 56 that hold a township board race, each named with its seed in the PR body.

**Files.** src/core2/modules/voting.ts, tests/golden-path/played-world.node-test.ts

**Notes.** Filed Oct 25 by the speed lead from PR 6037's red golden-path-year job, reproduced on clean main with the same seed; the assertion message points at voting.ts holdElection.
