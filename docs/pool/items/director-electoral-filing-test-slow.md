---
id: director-electoral-filing-test-slow
title: "electoral-scenes.test (filing and campaign stop) runs past 20 minutes in some drawn places: GOLDEN_PATH_SEED fs1 exceeds 1,200 seconds on clean main"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** `src/director/electoral-scenes.test.ts` (the filing and campaign stop) runs past 20 minutes in some drawn places: GOLDEN_PATH_SEED=fs1 exceeds 1,200 seconds on clean main. What the test spends the time on has not been measured.

**Cause.** Needs cause. Measured (title only): `src/director/electoral-scenes.test.ts` exceeds 1,200 seconds at GOLDEN_PATH_SEED=fs1 on clean main. It has not been run here and what it spends the time on has not been read.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session, to profile the test and then cut the cost.

**Rules.** Speed: the test stays within one CI unit job and no timeout is raised. Never drop an assertion to go faster. One rule, all 56 places: the test names the place and seed it drew.

**Done when.** A second session runs `src/director/electoral-scenes.test.ts` at GOLDEN_PATH_SEED=fs1 and one more drawn seed (names written down) in under 10 minutes each with every assertion kept, and the cause of the cost is named by file and function.

**Waits on.** Nothing.

**Files.** src/director/electoral-scenes.test.ts

**Notes.** TODO Released from idle draft #5196 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-7xkkii` (2026-10-20). Cleared from the front matter and kept here.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_SEED=fs1 npx vitest run src/director/electoral-scenes.test.ts`: green, 2 tests, 69.8 seconds, not over 1,200. Fresh draw `GOLDEN_PATH_SEED=439cfcba6d4f9279` (filing at White City, Kansas): green, about 7 minutes of wall time including a build. Not slow on these runs. Proposed for the CTO: drop as fixed on main.
