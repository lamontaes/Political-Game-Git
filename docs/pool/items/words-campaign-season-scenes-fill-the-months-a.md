---
id: words-campaign-season-scenes-fill-the-months-a
title: "A filed candidate's season brings scenes from the race's own records: a rival's filing, offers to help, word of a rival's campaign, interview and debate invitations"
area: words
kind: bug
priority: 1
size: M
status: done
claimed-by: words/campaign-season-scenes
pr: #6201
blocked-on:
source: "split from words-campaign-season-scenes-fill-the-months by the words-and-scenes lead, Oct 27"
lead: words
milestone: play-first
claimed-at:
---

**What.** The producers half of `words-campaign-season-scenes-fill-the-months`. The race's own records now stage scenes that stop a filed player's day, each with words and a reply the engine that made the record reads: a rival filing against them, people who know them offering to help once word reaches them, word of a rival's paid message passed on, the outlets' interview invitations, and the race's debate invitation. The scene narration stops restating the day and the player's home.

**Rules.** LAW.md §4 (scenes come out of what is happening in the world) and §9 (a quiet day is quiet). The scene-standard skill. No dice: offers and passing word on follow people's own reasons and contacts. The player's choices are the player's: the engine never answers an interview or a debate for them.

**Done when.** In a drawn place built with buildBenchWorld, a player who files and plays week by week gets the first scene or race story within 28 days of filing; at least three of the season's kinds fire; each cites a contest or person record id; and a yes in each new scene is read back by its engine (`src/director/campaign-season.test.ts`, place and seed named), with bench screenshots of the first two.

**Time box.** 6 hours.

**Files.** src/core2/modules/press.ts, meetings.ts, campaigns.ts, elections.ts, src/director/data/*.json, src/director/purpose-scene.ts, src/director/scene.ts, data/english/parts/scene-talk.json, scene-words.json

**Notes.** Split Oct 27 by the words-and-scenes lead. The parent keeps the 28-day rule through the middle of a quiet season (North Lynbrook, New York: May 9 to September 3 has nothing on record).
