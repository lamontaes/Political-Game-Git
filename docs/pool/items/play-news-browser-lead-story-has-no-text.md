---
id: play-news-browser-lead-story-has-no-text
title: "news.browser.mjs fails on main: the lead story prints no text on Kearny, New Jersey"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/news.browser.mjs asserts that the lead story under the headline has at least two sentences, selecting .paper-story.lead p. On a played life in Kearny, New Jersey (world seed m1-news-2, start date 2025-01-20, started with POST /api/newlife on the bench), the script prints an empty lead story text and fails with 'the lead story has under two sentences', on clean main and on the Oct 28 news-is-the-paper change alike. Found Oct 28 by Merger 1 while merging the News-is-the-paper change; a newspaper whose lead story prints no text is the thing the owner's Oct 27 newspaper ruling rules out.

**Rules.** Estimate, never UNKNOWN: a value a player sees starts from a real average and is marked as an estimate, so a lead story with nothing printed is a gap in the stories the paper is given, not an acceptable empty page. One rule, all 56 places: the check must hold for a drawn place, not for the one town it was written against.

**Done when.** In a played life of Kearny, New Jersey (seed m1-news-2) on the bench, the News front page prints a lead story with at least two sentences under its headline, or the story source names why this paper has none and the check draws a place whose paper has one; node src/bench/news.browser.mjs passes on that seed and on one other drawn place, with the lead story's record id named in the PR body.

**Files.** src/bench/news.browser.mjs, src/bench/ui/newspaper.mjs, src/bench/handler.ts

**Notes.** Reproduce: start a bench, POST /api/newlife?seed=m1-news-2&date=2025-01-20, then run the script with BENCH_BROWSER pointing at a Chromium with --no-sandbox. news-paper.browser.mjs passes on the same bench in Kingston, Oklahoma.
