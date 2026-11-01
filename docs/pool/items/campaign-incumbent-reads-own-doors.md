---
id: campaign-incumbent-reads-own-doors
title: "An incumbent reads what their own doors were told without waiting for word of a rival"
area: elections
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: governing
source: governing lead, Nov 1 (review of campaign-incumbent-hears-the-race)
---

**What.** raceReading opens a world candidate's reading of the race only on word of a rival (a rivalWord row) or the candidate's own poll, so what residents tell the candidate's own canvass at the door (the doors row's told field, kept by toldAtDoor) waits unread until a full person passes word on. Traced on seed 7d00da010de8fe91 in Lecompton, Kansas (before main's one-yes-a-race rule was merged in), the incumbent's doors were told of yeses to the player at 12 households from 2025-06-25, and nothing was read until word arrived on 2025-09-05. The told door answers should open a reading by themselves, sourced from a kept record of the evening they were told, so recordSteppedUp keeps one stepped-up row for each new evening's answers rather than every turn. SG-GOV-threat-from-told-yeses registers the gap until then.

**Rules.** Ask why: a resident's answer at the candidate's own door reached the candidate the evening it was given, by record, so the reading must not wait for anyone else to pass word on. One model, two tiers: counted and full residents open the reading by the same rule, times their count. Speed: read only the campaign's own doors rows (the byCampaign index), never the town or its history.

**Done when.** In a buildBenchWorld place with its seed printed, an incumbent with no rivalWord row and no poll, whose own doors rows hold told yeses to a rival, gets a raceReading sourced from a doors record that names the pledge ids; campaign-incumbent-response.test.ts asserts those ids and shows a twin with the yeses removed stepping up nothing; SG-GOV-threat-from-told-yeses no longer says what the doors were told is unread until word or a poll comes; and the played proof's clause (d) in campaign-real-race-played.test.ts accepts the new source kind by record id.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-incumbent-response.test.ts, src/core2/campaign-real-race-played.test.ts, src/core2/data/stopgaps.json

**Notes.** Found by the rules and played reviews of governing/incumbent-hears-the-race (Nov 1).
