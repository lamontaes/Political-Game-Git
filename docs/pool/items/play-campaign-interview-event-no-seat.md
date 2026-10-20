---
id: play-campaign-interview-event-no-seat
title: "A candidate who holds no seat can ask for a press interview and hold a campaign event from the campaign screen"
area: play
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/play-campaign-interview-event-no-seat
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T12:20:14.449Z
---

**What.** Since PR 5549 the campaign day shows only the doors and the calls as scenes, and the campaign day's interview and event acts have no control on the Campaigns screen (bench/campaign-day-controls.test.ts expects campaignDay kind event to throw). A candidate who holds no seat has no press desk, so they cannot ask an outlet for an interview or hold an event at all. Give them a scene control for each (an interview with an outlet that covers the race, an event at a venue from scene-places.json), run through takeCampaignDayChoice and the press and campaign engines. Also run the browser check the done-when of PR 5549 named: the Campaigns screen lists no acts.

**Rules.** This is a game, not a spreadsheet: a scene, not a form. No hand-written player text. No dice.

**Done when.** In a drawn place (named in the PR body), a candidate with no seat asks an outlet for an interview and holds an event from the Campaigns screen; each writes the engine's own record (interview row, event cause rows) shown by id; src/bench/campaign-day-controls.test.ts covers both, and a browser check shows no list of acts on the screen.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/controls.json, src/bench/campaign-day-controls.test.ts

**Notes.** Split from release-merge-audit-oct20-morning-fixes fix 4. The browser check was not run in that fix. Found Oct 20 by claude/political-game-pool-yucp92-au.
