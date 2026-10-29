---
id: words-home-talk-news-raise-seed
title: "The home-talk test fails where no news line is raised in a drawn town"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: added with npm run pool -- add
---

**What.** src/director/conversation-home-lines.test.ts fails in Wanamassa, New Jersey (GOLDEN_PATH_SEED=a1ed80950fac27866116967e1dcfc3d3600c3892) on clean main at 083ab41dad: the news-raise-heard pieces never play over 400 pairs' talks a month in, so 'expected 0 to be greater than 0'. Either nobody in that town heard a story to raise, or the raise is never reached; which one is not known yet. The other drawn places checked on Oct 29 passed, so the failure is this town's and not every town's.

**Rules.** One rule, all 56 places: a test that draws a place must pass in every place it can draw, or say why a place has nothing to show and draw again. Ask why: name the cause by record before changing the test.

**Done when.** In a played world (buildBenchWorld) in Wanamassa with that seed, a test run names why no news-raise-heard line played (the stories each person heard, by record id, or the step that skipped them), and the test passes there and in two more drawn places with the seeds named, without lowering what it checks.

**Files.** src/director/conversation-home-lines.test.ts, src/director/conversation.ts

**Notes.** Found Oct 29 by the Words and director session while checking PR 6759 (it fails the same way without that PR).
