---
id: tests-m0-03-election-morning-ends-jump
title: "Golden path M0-03 fails when a calendar jump reaches election morning: the polling-place pause reads as a jump that ended early"
lead: play-first
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The accepted golden-path spec M0-03 (src/bench/m0-check.ts) fails on main at 553bb7e78a with GOLDEN_PATH_SEED=d66119bba97518125829fc864eff970049d073f5e74ec36a164f8f5405bd6f7f and GOLDEN_PATH_PLACE_KEY=5031750 (Hardwick, Vermont): 'The jump ended early without a stop (complete).' The check's 30-day calendar jump from 2025-02-04 ends on 2025-03-04, Vermont's Town Meeting Day, because BenchPlayer.run in src/bench/player.ts stops for election morning: polling visit person_ff90668f8df7cbd0:2025-03-04, with the Selectboard contests contest:seat:gus2025:187831:board:0:2025-03-04 through board:2. That pause leaves the packet's kind as complete on that date, and the check accepts only a stop packet or a jump that reached its target, so a morning the player is rightly stopped for reads as an early end. It turned the golden-path check red twice on #6375 (head 44088842b9), whose diff touches neither file.

**Rules.** Never loosen the check: election morning (and a candidate's own election morning) is a stop the jump must make and must name, and nothing may be skipped past it. One rule, all 56 places: the check holds wherever the runner draws, election dates come from the place's records.

**Done when.** M0-03 passes on that seed and place on main and on two fresh seeds named in the PR body, its log naming the stop as election morning with the polling visit's record id; a jump that ends before its target with no stop, no election morning and no candidate morning still fails, shown by a test case.

**Files.** src/bench/m0-check.ts, src/bench/player.ts

**Notes.** Found Oct 27 by the laws-and-effects lead while checking #6375's golden-path red; reproduced on #6375's head and on main 553bb7e78a with the places CI drew.
