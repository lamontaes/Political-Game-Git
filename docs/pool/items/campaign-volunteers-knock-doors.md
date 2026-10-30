---
id: campaign-volunteers-knock-doors
title: "Volunteers knock doors: a campaign's volunteers walk its doors on the evenings their work and free hours leave them"
area: elections
kind: feature
priority: 1
size: M
status: claimed
claimed-by: governing/volunteer-shifts
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T02:30:25.639Z
---

**What.** A campaign's volunteers were only a list: someone who said yes to volunteering never walked a door, so the player's volunteers and every other candidate's moved no voters and a small campaign could cover only the doors its candidate walked alone. The owner said on Oct 29 to look at real races, where an underdog's campaign gains steam from the people working it, and that winning is 'not just door knocking, it's raising money and stuff like that'; volunteers carrying the doors is how a real local campaign covers a town. This is phase A of campaign-like-real-races: each volunteer walks the campaign's own walk list on the evenings their job and their day's free hours leave them, as often as their own reasons send them. The voters who open are moved and asked for their vote the same way the candidate's own doors move them.

**Rules.** No dice: whether a volunteer goes is a sliding share of the campaign's working days from their warmth, closeness, family and work week, carried until it makes a whole evening, never a roll or a cutoff. One model, two tiers: a counted resident who opens to a volunteer stays counted and answers the vote ask as a pledge by the same rule as a full person, and nobody is filled in. Wire to the world: the evening comes out of the day's discretionary time budget that the life and drives engines read, and the doors table and door count are shared with the candidate.

**Done when.** src/core2/campaigns.test.ts test 'volunteers walk the campaign's doors in the evening their work leaves free' passes in a drawn place and prints the place and seed (govReport campaigns-volunteer-shifts): of three enlisted volunteers the two with a free evening walk and the one whose work shift covers it stays home; a volunteer with one free hour left gives a one-hour shift and both discretionary budgets drop; every cause row from the shifts has act volunteer-door, actorId the volunteer and a matching impression row; each volunteer-shift event names its volunteer with firstShift and the door count; doorsKnockedCount equals the shifts' doors; nobody is filled in.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaigns.test.ts, src/core2/data/campaigns/parameters.json, src/core2/data/stopgaps.json

**Notes.** TODO
