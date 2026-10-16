---
id: people-news-test-no-public-hearing
title: "news.test.ts reads the fixture story after the retention pass has forgotten it"
area: people
kind: bug
priority: 3
status: in-pr
claimed-by: claude/news-test
pr: #4561
blocked-on:
milestone:
source: "found running src/core2/news.test.ts on clean main, Oct 16"
claimed-at: 2026-10-16T03:20:00.000Z
---

**What.** The test that a public-record story reaches residents through outlets failed on clean main: at Stanford, California (seed news-a) no resident had the story with public access at day 45. The cause is the test, not delivery. The monthly retention pass forgets a story older than the 30-day news life, so a read at day 45 finds nothing. The test now reads at day 29, inside the story's life. The player would notice nothing.

**Rules.** No dice. Replace, never layer: the retention pass is unchanged. Wire to the world: the played-world proof is the test beside it.

**Done when.** The test in src/core2/news.test.ts passes on a fixed seed and fails when it reads after the news life, and in the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body) a public-record story reaches residents through the outlet, with the story record id named.

**Files.** src/core2/news.test.ts

**Notes.** Red on clean main before this change.
