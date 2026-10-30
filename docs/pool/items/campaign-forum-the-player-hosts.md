---
id: campaign-forum-the-player-hosts
title: "A forum the candidate hosts: the residents who care most come and ask, and the candidate answers from the platform"
area: elections
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: governing/campaign-forum
pr: #6867
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T02:22:00.012Z
---

**What.** A candidate could knock doors, call donors and hold an event, but had no way to stand in a room with residents the campaign had never reached. The owner, Oct 29, on how real campaigns win: "you need to be able to... host a forum... meet your possible constituents... debate" and "it's not just door knocking". This unit adds a forum to the Campaigns screen: the campaign rents the evening's hall through the same venue payment as an event, the meetings engine's town hall fills the room with the residents who feel most strongly about a question, and the candidate answers each question from the platform they chose or declines it, so the people who came are now within the campaign's reach.

**Rules.** No dice: who comes is each resident's own drive (how strongly they feel about their top question, how much it touches their life, and their temperament toward taking part), and the hall's price is the world's event-venue unit price. Wire to the world: the forum pays the venue through the campaign's own spending path, writes town-hall causes and promises through the meetings and campaigns engines, and the people who came join the campaign's reach for its next calls and events. Look before you ask: it reuses holdTownHall and rentVenue, never a second meeting or spending system.

**Done when.** src/core2/campaign-day.test.ts passes in a drawn place with the run seed and place seed it prints: the forum is grayed with noPlatform until the campaign has a platform and with eventMoney until it can pay; the meetings row town-hall:<hostId>:<date> carries hostId and filingId; the venue money row event:<filingId>:<date>:<spentMinor> is a campaigns:purchase and spentByKind.event rises by the price; every attendee has exactly one town-hall cause row with candidateId set to the player; at least one newcomer outside the campaign's reach now has heardOf and is in reachablePeople; the durableLog event town-hall:<id> carries the filingId; every answer is the platform stance or declined, the platform is unchanged, and every promise is a platform stance; a second forum the same day is grayed with forumHeld. src/core2/office-day-town-hall-cadence.test.ts passes: an office town-hall act on a day the official already hosted a town hall holds no second one.

**Files.** src/core2/campaign-day.ts, src/core2/campaign-day.test.ts, src/core2/modules/campaigns.ts, src/core2/modules/meetings.ts, src/core2/office-day-acts.ts, src/core2/office-day-town-hall-cadence.test.ts, src/core2/data/campaigns/parameters.json, src/core2/data/stopgaps.json, src/bench/campaign.ts, src/bench/data/controls.json, src/bench/play.mjs, src/bench/campaign-day-controls.test.ts

**Notes.** TODO
