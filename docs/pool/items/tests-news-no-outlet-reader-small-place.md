---
id: tests-news-no-outlet-reader-small-place
title: "M2-09 fails where no resident reads the outlet (Cave, Missouri)"
area: people
kind: bug
priority: 2
size: S
status: blocked
claimed-by: claude/quirky-ride-vrwwz4-news-small-place
pr:
blocked-on: people-town-neighbors-no-ties
source: added with npm run pool -- add
claimed-at: 2026-10-24T04:44:50.131Z
---

**What.** The golden-path spec M2-09 (src/core2/news.test.ts) fails on clean main (185d76d7ce) in Cave, Missouri (place key 2912079, seed 89974afab8e8ef9592bf602b64510149e1b7a1423695217f04d8ee4e19eb39c4): 'expected 0 to be greater than 0' at news.test.ts:83, because no resident learns the story from an outlet; the other five news tests pass. The golden path draws its place from each PR's commit, so any PR that draws a place like this goes red on golden-path without touching news (seen on lamontaes/Political-Game-Git#5854). Find whether Cave has no outlet a resident follows or the story never reaches one, and fix the cause in the engine or in how the test picks its story, not the assertion.

**Rules.** One rule, all 56 places: the news test must hold in every drawn place, so fix why a small town's residents never read an outlet; never skip or weaken the assertion.

**Done when.** GOLDEN_PATH_SEED=89974afab8e8ef9592bf602b64510149e1b7a1423695217f04d8ee4e19eb39c4 GOLDEN_PATH_PLACE_KEY=2912079 node node_modules/vitest/vitest.mjs run --config src/core2/tooling/vitest.config.ts src/core2/news.test.ts passes with the cause named in the PR, and the test passes on three more drawn places named with their seeds.

**Files.** src/core2/news.test.ts, src/core2/modules/news.ts

**Notes.** TODO
