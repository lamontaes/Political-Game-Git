---
id: play-campaign-event-needs-platform-stance
title: "A candidate who filed with no stance cannot hold a campaign event; the Campaigns screen gives no reason"
area: play
kind: bug
priority: 3
size: S
status: blocked
claimed-by: claude/event-platform-stance
pr:
blocked-on: PR #5549 deletes the Today list, including the Hold an event control this bug is about; a stance now comes from the speech builder. If #5549 merges the bug closes; if the owner wants events back, they come as a scene that asks for a stance first
source: added with npm run pool -- add
claimed-at: 2026-10-20T13:41:41.135Z
---

**What.** In the Oct 20 browser run (PR 5680) Hold an event was disabled for a candidate who filed with an empty platform, because campaignDayChoices requires at least one platform stance and venue cash. The screen shows a greyed control with no reason. Decide whether an event should need a stance at all (Political Process baseline: check docs/roadmap/political-process-baseline.md and DECISION-REGISTER.md first), and if it does, let the player set a stance from the Campaigns screen or word why the control is off.

**Rules.** Look before you ask: read the register first. No hand-written player text: any reason is worded by the English engine. This is a game, not a spreadsheet.

**Done when.** In a drawn place (name it and the seed) a browser run shows a candidate with no stance either holds an event or sees a worded reason and a way to set a stance, with the cause rows or the stance record shown by id; src/bench/campaign-day-controls.test.ts covers it.

**Files.** src/core2/campaign-day.ts,src/bench/campaign.ts,src/bench/play.mjs

**Notes.** TODO
