---
id: gov-needs-opus-gov-165
title: "Needs from other sessions listed in OPUS-GOV.md (line 165): 4 lines"
area: gov
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OPUS-GOV.md "Needs from other sessions" (line 165)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- OPUS-CORE: `electorate.ts` reads the one turnout rule (hook in this branch); `electorate-places.ts` `readHousePlace` still decides a party's side by pattern; the counted population runs about five times the town (audit defect 37).
- OPUS-PEOPLE: the director's polling-place visit now carries `pollingPlaceId` and `pollWorkerIds` (hook in this branch); staging the poll workers resolves SG-PEOPLE-poll-workers. The English adapter for speech parts (move key and fact ids to words).
- GOV wiring: `candidacy.ts` `platformFromViews` should call `candidatePlatform`. Who runs leaves many town seats with one or no candidate (audit defects 9 to 11).
- OPUS-PLAY: controls for `campaignDayChoices`, the speech parts, `joinParty`; the bench reads `doorsKnockedCount`.

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
