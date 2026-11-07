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


Astra, Nov 7: Hidden Springs ID 1637500, replay 4656597f8770bfac, host 19940a91b8a7, election-year-only CPU profile at 9e18653fe4346d12227442846d81784a10163763 (the #7336 fix, now merged). All four record fingerprints equal the corrected law-levels timing run at 3a49175ae94aa863357ea10ea4aa8f9b6c0c8e7d; year4 digest 33aa959c831a0d95. Inclusive sampled time: campaignWork 50.601s, campaignTurn 40.276s, holdEvent 21.029s, makeStatements 16.528s; pressWeek 15.417s; GC15.218s. These overlap and must not be added. Law readers are small: lawInForce0.203s, lastEnactment0.208s, lawRows0.208s; all holdCommittee3.113s and world-legislating onWork1.945s. No law-reader cache change is justified as a recovery of the roughly8s final-year shortfall. Astra leaves campaigns/electorate/views to State Sessions. The separate unprofiled four-year run took86.3,166.3,103.9,191.0s against the assignment baseline81.2,156.2,92.5,174.8: all four miss its5% cumulative bar. Profile and reproduction are in PR#7335 body. This adds a second place to the existing campaign/persuasion evidence, not a change to this item's finish line.
