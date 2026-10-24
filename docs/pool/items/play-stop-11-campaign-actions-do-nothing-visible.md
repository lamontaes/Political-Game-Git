---
id: play-stop-11-campaign-actions-do-nothing-visible
title: "Give a speech, Ask for an interview and Call donors show nothing and raise nothing"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After filing for Anson City Council on the v0.22.10 release, I opened Politics → Campaigns. Give a speech made the button disappear and nothing else happened: no speech, no audience, no words. Ask for an interview added the line "Ask for an interview" and nothing more. Call donors added "Call donors" and the total stayed "$0.00 raised". Hold an event stayed grayed with no reason. Only Knock on doors shows a scene, and its voters can't be clicked. I expected each action to show what happened: what I said, who answered, money raised or a reason it wasn't.

**Rules.** Wire to the world: each campaign action moves money, people or views and the player sees the result. This is a game, not a spreadsheet: a campaign day is told as a scene through the director and the English engine.

**Done when.** The owner does the same steps on the next build and is not stopped: in the first week after filing, Give a speech, Ask for an interview and Call donors each show a scene or a result line, Call donors can raise money from someone, and a grayed action says why. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/campaign.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:05, 16:06; screenshots 49, 50, 53, 54, 55.
