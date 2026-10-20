---
id: play-campaign-screen-browser-check
title: "Run the browser check on the Campaigns screen: no list of acts, with the interview and event controls beside doors and calls"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** PR 5674 added Hold an event and Ask for an interview controls to the Campaigns screen (src/bench/play.mjs, src/bench/data/controls.json) and PR 5549's done-when named a browser check that was never run. Open the Campaigns screen in a real browser in a drawn place with a candidate on a ballot, and confirm it shows the four outing controls (doors, event, interview, calls) with their control names, no list of acts, and that taking an event shows the venue scene and taking an interview shows its result line. File a pool item for anything that looks wrong.

**Rules.** This is a game, not a spreadsheet: a scene, not a form. No hand-written player text: control names come from src/bench/data/controls.json. Follow the browser-visual-acceptance skill.

**Done when.** In a drawn place from all 56 (name it and the seed) the browser run shows the Campaigns screen with the four controls and no list of acts, and each control taken writes the engine's own record by id (cause rows for the event, the interview row for the interview); a screenshot is attached to the PR body and a test or note records the result.

**Files.** src/bench/play.mjs,src/bench/data/controls.json,src/bench/campaign-day-controls.test.ts

**Notes.** TODO
