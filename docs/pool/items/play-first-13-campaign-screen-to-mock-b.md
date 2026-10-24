---
id: play-first-13-campaign-screen-to-mock-b
title: "Campaign acts leave the tab and start as scenes at places"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-first-13-campaign-screen-to-mock-a,play-stop-11-campaign-actions-do-nothing-visible-b
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** The owner ruled Oct 20: no "Today" list of acts; campaign acts are scenes you go to (a venue for a speech, doors to knock, an interview, a debate). The v0.22.10 Campaigns tab carried every act as a button, and the debate was a form with Pass, For and Against. This item moves the remaining acts (doors, an event, the debate) to scenes started from Travel, people and places, and takes the act buttons off the tab.

**Rules.** Serves LAW.md §4, Scenes and conversations. This is a game, not a spreadsheet: acts start from people, places and scenes, never a menu list. Replace, never layer: the act buttons are removed from the tab when the scenes exist.

**Done when.** In a drawn place after filing, knocking on doors, an event and the debate each start from Travel or a person as a scene with people on screen, and the Campaigns tab shows no act buttons, shown by a screenshot of each.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Knocking on doors, holding an event and the debate each start from a place as a scene; the Campaigns tab has no list of acts.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/director/scene-talk.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
