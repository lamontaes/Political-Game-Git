---
id: play-issue-stances-on-screen
title: "Campaigns shows where the town's voters stand on the issues the race turns on"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from people-views-opening-stance-per-question)
lead: play-first
milestone: play-first
---

**What.** Views are moving to one stored stance per person per question, through people-views-opening-stance-per-question. The campaign screen shows a poll total but not what voters think about the issues. Under the race, show the two or three questions the race turns on with the share of the town leaning each way, in words, read from the stored stances, so the player can choose what to campaign on.

**Rules.** Serves LAW.md §11, The world on screen makes sense. This is a game, not a spreadsheet: two or three issues in words, not a table of shares. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, after filing, Campaigns shows two or three issues with the town's lean on each, matching sums over stance records in a test, shown by a screenshot with the place and seed named. The owner plays it: he sees it on Politics → Campaigns in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Campaigns tells you which issues your race turns on and which way the town leans.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/campaign.ts, src/bench/polling.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: people-views-opening-stance-per-question's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with people-views-opening-stance-per-question (needs-from in the handoff line).
