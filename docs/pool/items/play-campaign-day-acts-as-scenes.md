---
id: play-campaign-day-acts-as-scenes
title: "The campaign day's door-knocking, calls and fundraising are scenes, so the Today list can go"
area: play
kind: feature
priority: 2
size: L
status: in-pr
claimed-by: claude/campaign-acts-scenes
pr: #5549
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:57:05.783Z
---

**What.** The Campaigns tab still lists the campaign day's acts (the Today list: doors, calls, fundraising) with hours. The owner ruled on Oct 20 that the campaign day has no list of acts and that speeches, doors, interviews and debates are scenes. Speeches, interviews and debates already open as panels or scenes; doors, calls and fundraising by day have none, so the list cannot be removed without leaving the player no way to do them. Build a doors scene (a street of homes from the district's records, the person who answers read from their record) and a call and fundraising scene, then delete the Today list.

**Rules.** No hand-written player text: the words come from the English engine and control names. Replace, never layer: the Today list and its controls are deleted in the same change. Wire to the world: doors knocked and money raised change the campaign record the vote reads. No scrolling inside sheets. One rule for all 56 places.

**Done when.** In a played world (buildBenchWorld) in a drawn place and seed, a candidate knocks doors through a scene that names the household record ids and changes the campaign's doors count, the campaign day list is gone from the Campaigns tab, and a browser check opens Campaigns and finds no list of acts.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/director

**Notes.** TODO
