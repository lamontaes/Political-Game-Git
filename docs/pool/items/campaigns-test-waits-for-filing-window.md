---
id: campaigns-test-waits-for-filing-window
title: "campaigns.test.ts finds no open contest on its first day now that filing opens on a set day"
area: elections
kind: bug
priority: 1
size: S
status: done
claimed-by: governing/campaigns-test-window
pr: #7171
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T04:14:15.361Z
---

**What.** src/core2/campaigns.test.ts, 'every activity moves specific people with a recorded cause; a rival campaigns; polls report what people said', looks for an open contest both candidates can file for only on its start day. Since filing opens on a set day (elections-filing-window-opens and the one-race rule), a drawn place can have none open that day, and the test fails before it reaches anything it checks: on main 37ac735ca0, GOLDEN_PATH_SEED=cm-1 fails with 'no open contest the two candidates could both qualify for in 1529000', while cm-2 passes. Found by Lane 1 while checking the rival attack-ad change, where it fails the same way.

**Rules.** Never weaken a test: only how the test finds its race changes, by letting the weeks pass until a contest opens, bounded and named; what it checks of the campaigns stays. One rule, all 56 places: the place is drawn from all 56 and named with its seed.

**Done when.** campaigns.test.ts passes at GOLDEN_PATH_SEED=cm-1 (place 1529000) and on three fresh seeds, each printing the place and seed and the day it filed, by letting the weeks pass until both candidates can file in an open contest, with nothing it checks loosened.

**Files.** src/core2/campaigns.test.ts

**Notes.** TODO
