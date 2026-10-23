---
id: gov-needs-opus-gov-165
title: "Needs from other sessions listed in OPUS-GOV.md (line 165): 4 lines"
area: gov
kind: wiring
priority: 2
status: done
claimed-by: claude/gov-needs-opus-gov-165
pr: #4525
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OPUS-GOV.md "Needs from other sessions" (line 165)'
claimed-at: 2026-10-15T23:34:06.399Z
---

**What.** Four wiring requests remain on elections: `electorate.ts` reads the one turnout rule and `readHousePlace` still decides a party's side by pattern, `candidacy.ts` `platformFromViews` should call `candidatePlatform` (so that who runs leaves fewer town seats with one or no candidate, audit defects 9 to 11), the director's polling-place visit should stage poll workers (SG-PEOPLE-poll-workers), and play needs controls for `campaignDayChoices`, the speech parts and `joinParty`. The player would notice real contested town races, poll workers at the polling place, and a campaign day he can run. Verify each line against main first.

**Rules.** An effect is a read, not a record: turnout, party side and platform are each read from views and law at the moment a voter or candidate decides; No dice: who runs and how a voter leans come from traits, views and relationships, never a roll or a name pattern; One model, two tiers: the counted electorate (about five times the town, audit defect 37) uses the same turnout rule as a full voter times its count; One rule, all 56 places: no party or place named in code; Replace, never layer: the pattern-matching party side is deleted in the same change; No hand-written player text: controls and lines come from `controls.json` and the English engine.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the town's seats have more than one candidate where voters exist to run, the party side of a House place is read from votes data, the polling place shows named poll workers, and each candidate's platform comes from `candidatePlatform`. Tests beside `src/core2/candidacy.test.ts` and `src/director/polling-place.test.ts`. The owner plays it: votes at a polling place with named workers and sees more than one name on his town ballot.

**Files.** src/core2/electorate.ts, src/core2/electorate-places.ts, src/core2/modules/candidacy.ts, src/director/polling-place.ts, src/bench/campaign.ts

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
