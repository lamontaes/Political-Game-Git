---
id: tests-rival-chooser-nobody-to-ask
title: "campaign-turn.test's rival chooser fails in draws where the rival has nobody left to ask for money"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/campaign-turn.test.ts, 'a rival chooses between calls and doors by their money and standing, sliding with each', fails on clean main in Simsboro, Louisiana (2270630, run seed 4f45d3c2526616ba66fcc1878d9fd59603eb8b0694d8f0ee880816a19e615a83): 'empty bank leans on calls: expected 0 to be greater than 0'. The share of the rival's hours spent on calls is 0 with an empty bank and with a full one, which happens when Call donors is not offered to the rival at all (nobody they can reach is left to ask), so the bank has nothing to slide. The test draws a random place each run, so it fails on some draws and passes on others.

**Rules.** Never skip, disable or quarantine a test. One rule, all 56 places: the test keeps drawing from all 56 and names the place and seed.

**Done when.** The test picks a rival the records offer both calls and doors to (or checks the call and door scores themselves when calls are not offered), and with GOLDEN_PATH_SEED=4f45d3c2526616ba66fcc1878d9fd59603eb8b0694d8f0ee880816a19e615a83 it passes in Simsboro, Louisiana, along with three other random draws named in the PR.

**Files.** src/core2/campaign-turn.test.ts

**Notes.** Found Oct 25 by the speed lead running the campaign tests for play-stop-25 (branch claude/play-stop-25-door-count); reproduced on clean main at 17b49c7c4b with the same seed.
