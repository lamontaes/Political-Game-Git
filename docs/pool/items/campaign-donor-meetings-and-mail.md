---
id: campaign-donor-meetings-and-mail
title: "A donor meeting at a supporter's home and mail the player sends, as campaign acts"
area: elections
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: governing/campaign-donor-meetings
pr: #6869
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T02:22:41.867Z
---

**What.** A player running for office could knock doors, hold an event, give an interview and call donors, but could not meet donors at a supporter's home or send campaign mail, so a campaign's money came only from call time. The owner, Oct 29, on real races: "some people... just do donor meetings" and "it's not just door knocking, it's raising money and stuff like that that needs to be decided for A." This unit, phase A of campaign-like-real-races, adds a donor meeting as a campaign day choice: someone in the candidate's circle hosts a house party, the candidate meets the room, speaks, and asks each guest by name for money through the engine's own donation ask. It also adds a Mail button to the Campaigns screen that spends the amount the player sets on mailers through the campaign engine, never more than the campaign holds.

**Rules.** No dice: the host is the best-scoring person in the candidate's circle by their own evening reasons and lean on the volunteer decision, each guest comes by the same rule an event uses plus their tie to the host, and each gift comes from donationAnswer reading the guest's own warmth and spare cash. Look before you ask: built through the campaigns engine's donation ask, makeStatements, api.meet and sendMail, never a second fundraising system. Read-only screens create no facts: reading the Campaigns screen scores possible hosts without saving a weighed decision; the chosen host decides once, inside the meeting.

**Done when.** src/core2/donor-meeting.test.ts, in a place drawn from all 56 whose name, run seed and place seed every assertion prints, files a candidate, walks four shifts of doors and holds a donor meeting: two reads of campaignDayChoices keep no new durable-log record; the host is from the candidate's circle and has exactly one person.weighed record, campaigns.volunteer:yes; every guest was invited and is asked once, host first; every giver has a gift row <filingId>|<donorId> within the contribution limit, a campaigns:donation journal row and a public campaign-gift event; every not-warm or no-spare answer matches the person's own records; and the campaign-donor-meeting event carries hostId, came, gave, raisedMinor and donorIds with the guests as witnesses. src/bench/campaign-mail.test.ts, in a drawn place, shows the Mail act buys whole mailers up to the amount set and never past what the campaign holds, with one campaigns:purchase journal row and cause rows with act mail, and that the house party outing runs the donor meeting from the Campaigns screen.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/data/campaigns/parameters.json, src/core2/data/stopgaps.json, src/core2/donor-meeting.test.ts, src/core2/campaign-day.test.ts, src/bench/campaign.ts, src/bench/data/controls.json, src/bench/play.mjs, src/bench/campaign-mail.test.ts, src/bench/campaign-day-controls.test.ts

**Notes.** Phase A of campaign-like-real-races, built by the governing lead on branch governing/campaign-donor-meetings. Searched docs/pool/items for donor, house party, mail and sendMail: no twin (words-donor-ask-scene is the done Words side of a gift record).
