---
id: tests-news-no-outlet-reader-small-place
title: "M2-09 fails where no resident reads the outlet (Cave, Missouri)"
area: people
kind: bug
priority: 2
size: S
status: blocked
standard: 2
claimed-by: claude/quirky-ride-vrwwz4-news-small-place
pr:
blocked-on: people-town-neighbors-no-ties
source: added with npm run pool -- add
claimed-at: 2026-10-24T04:44:50.131Z
after:
lead: laws-effects
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** The golden-path spec M2-09 (src/core2/news.test.ts) fails on clean main (185d76d7ce) in Cave, Missouri (place key 2912079, seed 89974afab8e8ef9592bf602b64510149e1b7a1423695217f04d8ee4e19eb39c4): "expected 0 to be greater than 0" at news.test.ts:83, because no resident learns the story from an outlet; the other five news tests pass. The golden path draws its place from each PR's commit, so any PR that draws a place like this goes red on golden-path without touching news. Find whether Cave has no outlet a resident follows or the story never reaches one, and fix the cause in the engine or in how the test picks its story, not the assertion. The item is marked blocked with no named blocker.

**Cause.** Needs cause. Looked at src/core2/news.test.ts (line 83) and src/core2/modules/news.ts: whether Cave, Missouri has no outlet a resident follows, or the story never reaches one, was not read. The item is marked blocked with no stated blocker; the first session to take it clears the status. Measured: GOLDEN_PATH_SEED=89974afab8e8ef9592bf602b64510149e1b7a1423695217f04d8ee4e19eb39c4 GOLDEN_PATH_PLACE_KEY=2912079 (Cave, Missouri).

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** One rule, all 56 places: the news test must hold in every drawn place, so fix why a small town's residents never read an outlet; never skip or weaken the assertion. Ask why: name by record whether the outlet or the story is missing.

**Done when.** A second session runs GOLDEN_PATH_SEED=89974afab8e8ef9592bf602b64510149e1b7a1423695217f04d8ee4e19eb39c4 GOLDEN_PATH_PLACE_KEY=2912079 node node_modules/vitest/vitest.mjs run --config src/core2/tooling/vitest.config.ts src/core2/news.test.ts in Cave, Missouri and sees it pass, with the cause named in the PR, and then on three more drawn places named with their seeds.

**Waits on.** Nothing (its status is blocked with no named blocker; clear it when taking the item).

**Files.** src/core2/news.test.ts, src/core2/modules/news.ts

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/news.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=89974afab8e8ef9592bf602b64510149e1b7a1423695217f04d8ee4e19eb39c4 GOLDEN_PATH_PLACE_KEY=2912079 (Cave, Missouri): 6 of 6 passed. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-<random> (the number was not kept; place not printed): 6 of 6 passed. Green on both. Proposed for the CTO: drop as fixed on main.
