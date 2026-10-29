---
id: words-home-talk-news-raise-seed
title: "The home-talk test fails where no news line is raised in a drawn town"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: words/home-talk-news-headline
pr: #6770
blocked-on:
lead: words
source: added with npm run pool -- add
claimed-at: 2026-10-29T17:06:46.807Z
---

**What.** src/director/conversation-home-lines.test.ts fails in Wanamassa, New Jersey (GOLDEN_PATH_SEED=a1ed80950fac27866116967e1dcfc3d3600c3892) on clean main at 083ab41dad: the news-raise-heard pieces never play over 400 pairs' talks a month in, so 'expected 0 to be greater than 0'. Either nobody in that town heard a story to raise, or the raise is never reached; which one is not known yet. Only this one town was run on Oct 29, so whether other towns fail the same way is not known.

**Rules.** One rule, all 56 places: a test that draws a place must pass in every place it can draw, or say why a place has nothing to show and draw again. Ask why: name the cause by record before changing the test.

**Done when.** In a played world (buildBenchWorld) in Wanamassa with that seed, a test run names why no news-raise-heard line played (the stories each person heard, by record id, or the step that skipped them), and the test passes there and in two more drawn places with the seeds named, without lowering what it checks.

**Files.** src/director/conversation-home-lines.test.ts, src/director/conversation.ts

**Notes.** Found Oct 29 by the Words and director session while checking PR 6759 (it fails the same way without that PR). More evidence, Oct 29: on clean main it fails the same way in Morris, Minnesota (6e5c80fe002e38156f66cc0b7a3bd6e355dff037), Ruleville, Mississippi (6e5608a2f3d0c68278fcb1f8a8a4ef065c1df3d3) and Hilger, Montana (330b294fe4b1fc630e9c8ac10d5c5f6994a3d5ba), and on PR 6764 in Green Oaks, Illinois. In Wanamassa the talks do raise news, but by topic ('I saw Keystone News Network ran a story on coverage and insurance.'), never by headline: printedHeard in src/director/conversation.ts found no printed story with a headline that the speakers had heard in the last 90 days. Including the player's own circle in the test's talks did not change it.
