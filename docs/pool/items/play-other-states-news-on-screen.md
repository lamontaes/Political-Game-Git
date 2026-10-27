---
id: play-other-states-news-on-screen
title: "News carries other states' monthly jobs reports as short stories"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from news-other-places-events-not-kept)
lead: play-first
milestone: play-first
---

**What.** The regional engine writes a jobs report for every state each month, and news-other-places-events-not-kept keeps them where the news reads them. News shows only the player's own state, so the country around the town feels empty. Print a short story when a neighboring or large state's unemployment moves a notable amount, worded by the English engine from the report record, under a Nation heading.

**Rules.** Serves LAW.md §11, The world on screen makes sense. No hand-written player text: the story's words come from the English engine and its numbers from the report record. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, over a played quarter, News shows at least one other state's jobs story whose numbers match a regional report record id named in a test, worded with no field name or ISO date, shown by a screenshot with the place and seed named. The owner plays it: he sees it on News in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** News tells you when another state's jobs picture changes, not only your own.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/story.ts, src/bench/economy.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: news-other-places-events-not-kept's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with news-other-places-events-not-kept (needs-from in the handoff line).
