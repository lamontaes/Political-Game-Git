---
id: elections-filing-test-waits-for-filing-window
title: "elections-filing.test.ts M2-03 finds no open contest on its first day now that filing opens on a set day"
area: elections
kind: bug
priority: 1
size: S
status: open
lead: governing
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T15:32:07.567Z
---

**What.** src/core2/elections-filing.test.ts, 'M2-03 filing (engine)', expects openContests to be non-empty on the world's first day (line 149). Since filing opens on a set day (elections-filing-window-opens, 00f74b7542), a drawn place can have none open that day: on main 44dca16448, GOLDEN_PATH_SEED=962dfb9c9773d29ab7a7f7840258fae3ed04c1874692b74f7f561eaaa8865a8e (West Hattiesburg, Mississippi) fails with 'expected 0 to be greater than 0'. It turns golden-path M2-02 red on every PR whose draw lands there (seen on #7233, a skills-only PR). Same cause as campaigns-test-waits-for-filing-window (#7171), which fixed only campaigns.test.ts. Found by Lane 4.

**Rules.** Never weaken a test: only how the test finds its race changes, by letting the weeks pass until a contest opens, bounded and named, the way #7171 did; what it checks of filing stays. One rule, all 56 places: the place is drawn from all 56 and named with its seed.

**Done when.** elections-filing.test.ts passes at GOLDEN_PATH_SEED=962dfb9c9773d29ab7a7f7840258fae3ed04c1874692b74f7f561eaaa8865a8e and on three fresh seeds, each printing the place, seed and the day it filed, with nothing it checks loosened.

**Files.** src/core2/elections-filing.test.ts

**Notes.** Built on lane-4/elections-filing-test-window (1d6f5c02fb), Nov 4: passes at the failing seed (place 5176432, open on 2026-02-02) and three fresh seeds (b9691f71…, 7273716, June 15; 412ec8f4…, 5033325, Jan 5; 1c39895f…, 1933420, Jan 12). PR not opened: this session's GitHub token is invalid. Anyone may open it from that branch, line 1 `Pool item: elections-filing-test-waits-for-filing-window`. Set back to open at the owner's Nov 4 stop; claiming it takes branch lane-4/elections-filing-test-window.
