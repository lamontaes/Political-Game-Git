---
id: play-issue-stances-on-screen
title: "Campaigns shows where the town's voters stand on the issues the race turns on"
area: play
kind: feature
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-issue-stances-on-screen
pr: #8452
blocked-on:
source: Oct 25 pool audit, on-screen pass (from people-views-opening-stance-per-question)
lead: play-first
milestone: play-first
after:
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:01:13.692Z
branch: claude/pool-play-issue-stances-on-screen
---

**What.** Views now store one opening stance per person per question for the questions the survey asks (the three children of people-views-opening-stance-per-question are done). The campaign screen shows a poll total but not what voters think about the issues. Under the race, show the two or three questions the race turns on with the share of the town leaning each way, in words, read from the stored stances, so the player can choose what to campaign on. Questions with no survey item keep the lean alone and are shown as estimates.

**Cause.** Design: docs/play-first/LAW.md section 11 (the world on screen makes sense) and the stored stances from `openingRecord` and `openingStance` in src/core2/modules/views.ts; src/bench/campaign.ts and src/bench/polling.ts show a poll total but no issues.

**Fix.** After filing, show on Campaigns the two or three questions the race turns on with the town's lean on each, in words, summed from stance records; when nothing is known, say why in words.

**Time box.** 3 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** Serves LAW.md section 11. This is a game, not a spreadsheet: two or three issues in words, not a table of shares. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** A second session, in a drawn place on the bench, after filing, sees Campaigns show two or three issues with the town's lean on each, matching sums over stance records in a test, shown by a screenshot with the place and seed named. The owner sees it on Politics, Campaigns in his own game without opening dev mode.

**Waits on.** Nothing.

**Files.** src/bench/campaign.ts, src/bench/polling.ts, src/bench/play.mjs, src/core2/modules/views.ts

**You will see.** Campaigns tells you which issues your race turns on and which way the town leans.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Notes.** Filed by the Oct 25 pool audit: people-views-opening-stance-per-question's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with people-views-opening-stance-per-question (needs-from in the handoff line).

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:01 UTC) on branch claude/pool-play-issue-stances-on-screen.
