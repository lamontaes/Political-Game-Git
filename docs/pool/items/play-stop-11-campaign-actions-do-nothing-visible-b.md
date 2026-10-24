---
id: play-stop-11-campaign-actions-do-nothing-visible-b
title: "Give a speech and Ask for an interview each play as a scene at a place"
area: elections
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-stop-11-campaign-actions-do-nothing-visible-a
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release Give a speech made its button disappear and Ask for an interview added its own name as a line; nothing else happened. The owner ruled Oct 20 that campaign acts are scenes you go to and Oct 14 that a speech is built a part at a time, as in Suzerain. This part makes both acts open a scene at a place with people, words and an outcome back into the campaign.

**Rules.** This is a game, not a spreadsheet: a campaign act is a scene with people and choices, never a line on a tab. No hand-written player text: the speech parts and the reporter's questions come from the English engine.

**Done when.** In a drawn place after filing, Give a speech opens a scene at a venue with at least two rounds of four speech parts, and Ask for an interview opens a scene with a named reporter, each changing a campaign record shown on Campaigns.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/director/scene-talk.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-11-campaign-actions-do-nothing-visible (Oct 24, lane). Speech and interview words are the Words lead's (`needs-from: words`). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
