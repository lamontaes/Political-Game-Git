---
id: elections-own-choice-filer-walks-petition-doors
title: "A player who files and lets the days pass on their own choices walks their petition's doors"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-p37c46
pr: #9492
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15 11:16Z: home-talk-own-race-only red on the Train at Sherrodsville OH 3972242, seed scan-25, after the fold of #9473
---

**What.** A filed controlled player whose days pass on their own choices did nothing for their petition: no one canvassed for them unless a volunteer near the line happened to join, so the petition ended short and the count never named them. They now walk its doors the way an unattended candidate does, on days they take no campaign choice by hand. Seen: at Sherrodsville OH a person who files and advances days holds the 10 signatures the clerk counts and is on the ballot, and the house talks about their race.

**Cause.** Found in code: src/core2/modules/campaigns.ts, the daily race loop runs `volunteerShifts` and `circulatorShift` for every filing but skips `campaignTurn` (the candidate's own doors) for the controlled person, and the day-choice engine (src/core2/campaign-day.ts `contextOf`) opens a world candidate's day only for someone who is not the controlled person, so canvass was never taken for a player on own-choice. Before the fold of #9473 one volunteer joined and walked 41 doors; after it the volunteer's lean fell on the other side of the line, no one walked, and the petition stayed at 0.

**Fix.** `ownChoicePetitionDoors` runs in that loop for the controlled person's filing while its petition circulates and the player took no campaign choice by hand today (`handDay`, set by `takeCampaignDayChoice` for a hand-taken choice): it takes the canvass choice in a new `"own-choice"` day mode, with the hours `rivalDay` gives a world candidate of their means (the base hours with or without a job, shaped by their own lean). Doors only: no asks and nothing spent, so the character never moves the player's money.

**Time box.** 3 hours.

**Rules.** Standing rule no dice: the doors answer for their own reasons and the hours come from the candidate's own traits and job, no draw. Standing rule sliding scales: the hours slide with the petition's shortfall, nothing flips at a line. Owner Oct 14 (the player's choices are the player's) and Oct 16 (the character never moves the player's money) hold.

**Done when.** A second session, on main at a drawn place (Sherrodsville OH 3972242, seed scan-25), runs src/core2/campaign-own-choice-petition.test.ts and src/director/home-talk-own-race-only.test.ts and both pass; the first shows the day's hours and the signatures gathered.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/campaign-own-choice-petition.test.ts

**Notes.** Own PR on the Train head, thread "Build scenes after the race". The filer case of home-talk-own-race-only.test.ts is unchanged. Unattended filers already gather (Stoneham MA).
