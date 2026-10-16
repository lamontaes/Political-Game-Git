---
id: people-news-test-no-public-hearing
title: "news.test.ts: nobody hears the fixture story through an outlet in 45 days (Stanford, California)"
area: people
kind: bug
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found running src/core2/news.test.ts on clean main, Oct 16"
claimed-at:
---

**What.** The test that a public-record story reaches residents through outlets fails on clean main: in the fixture world at Stanford, California (seed news-a) with only the views and news modules installed, no resident has the story with public access after 45 days, so the outlet count is zero, though people were told by others. It passed before a recent news change. Find which change stopped the delivery calendar from reaching residents, and fix the engine or the test's world, whichever is wrong.

**Rules.** No dice. An effect is a read: delivery reads the viewer's engagement and trust. Replace, never layer. Wire to the world: prove in the played world as well as the fixture.

**Done when.** The test in src/core2/news.test.ts passes on a fixed seed, and in the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body) a public-record story reaches at least one resident through an outlet, with the story record id named. The owner plays it: reads the paper and hears neighbors mention it.

**Files.** src/core2/modules/news.ts, src/core2/news.test.ts

**Notes.** Red on clean main, so it does not block other work.
