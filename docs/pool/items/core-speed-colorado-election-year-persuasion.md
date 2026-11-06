---
id: core-speed-colorado-election-year-persuasion
title: "Upper Witter Gulch election year: campaign events and the stance they move take most of the year"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Upper Witter Gulch, Colorado (0879800, seed 5a1c0de7a11ce5e1), year 4 with the profiler on: 182 s, of which 146 s is the day loop. Campaign work is 50 s (campaignTurn 37 s; takeCampaignDayChoice 21 s, nearly all holdEvent 17 s), applying each event to listeners costs 20 s (the views engine's onEvent 9 s: stanceAfterCase 4.1 s, standingWith 1.4 s, putOwned 1.6 s; drives onEvent 4.3 s; life onEvent 2.3 s) and the collector 36 s.

**Rules.** Speed: the election year must run under 120 s on npm run speed:year; no dice; a cut must keep the same records (speed:year --same-records).

**Done when.** npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1 shows year 4 under 120 s on the same machine as the base, with --same-records passing; the PR names each cut by function and the seconds it saved.

**Files.** src/core2/modules/views.ts,src/core2/modules/campaigns.ts,src/core2/campaign-day.ts,src/core2/modules/drives.ts

**Notes.** Profile by State Sessions Nov 6 (scripts/speed-years/profile.mjs on a Profiler session around year 4). Ideas, not tried: a person's persuasion lean (decisionLean in stanceAfterCase) is the same for every event, so read it once; a rally's listeners could be one counted group with one move; fewer rows kept so the collector has less to scan.
