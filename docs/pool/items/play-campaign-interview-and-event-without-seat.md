---
id: play-campaign-interview-and-event-without-seat
title: "A candidate who holds no seat can ask for an interview and hold an event from the campaign day"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Merge audit fix 4 found that the campaign day (PR #5549) offers the doors and the calls as scenes, but a candidate who holds no seat has no control to ask for an interview or to hold an event; those choices exist in the engine (interview and event kinds in takeCampaignDayChoice) and the bench view throws on 'event'. Add a scene control or a press-desk entry so a candidate in a race can ask an outlet for an interview and hold an event, each running the engine's own act. The player would notice an interview and an event among the day's choices and a scene for each.

**Rules.** Screens show record data and control names; no hand-written player text (words from the English engine). This is a game, not a spreadsheet: each is one choice with a scene, not a form. An effect is a read: the interview and the event move the race through the engine's causes.

**Done when.** In a played world (buildBenchWorld) in a drawn place and seed named in the PR body, a candidate with no seat takes the interview choice and the event choice from the campaign view by control name, each writes the engine's own act and cause records named by id, and src/bench/campaign-day-controls.test.ts asserts both.

**Files.** src/bench/campaign.ts, src/bench/campaign-day-controls.test.ts, src/bench/data/controls.json

**Notes.** Filed by fs11vb from the Oct 20 merge audit, fix 4 (which allowed filing the gap as its own item).
