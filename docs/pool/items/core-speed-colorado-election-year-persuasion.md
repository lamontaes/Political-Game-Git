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


Astra, Nov 7: Hidden Springs, Idaho (`1637500`), replay `4656597f8770bfac`, host `19940a91b8a7`. Election-year-only CPU profile at `9e18653fe4346d12227442846d81784a10163763` (the #7336 fix, now merged). All four record fingerprints match the corrected law-levels timing run at `3a49175ae94aa863357ea10ea4aa8f9b6c0c8e7d`; year 4 digest: `33aa959c831a0d95`.

Inclusive sampled time: `campaignWork` 50.601 s, `campaignTurn` 40.276 s, `holdEvent` 21.029 s, `makeStatements` 16.528 s; `pressWeek` 15.417 s; garbage collection 15.218 s. These overlap and must not be added. Law readers are small: `lawInForce` 0.203 s, `lastEnactment` 0.208 s, `lawRows` 0.208 s; `holdCommittee` 3.113 s and world-legislating `onWork` 1.945 s. A law-reader cache cannot recover the roughly 8 s final-year shortfall from those reads alone. Astra leaves campaigns, electorate and views to State Sessions.

The separate unprofiled four-year run took 86.3, 166.3, 103.9 and 191.0 s against the assignment baseline of 81.2, 156.2, 92.5 and 174.8 s: all four miss its 5% cumulative bar. The profile and reproduction are in [PR #7335](https://github.com/lamontaes/Political-Game-Git/pull/7335). This adds a second place to the existing campaign/persuasion evidence; it does not change this item's finish line.

Nov 8 (State Sessions): where the year stands and what did not help. Clean runs of `npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1 --years 4 --exclusive` on main: year 1 47.1 s, year 2 95.9 s, year 3 56.7 s, year 4 121.1 s (a run an hour earlier on the same code gave 123.5 s and another 128.4 s, so the machine moves it by about 5 percent: the bar is within the noise today). Tried and measured, no gain: a person-to-jobs index for monthlyIncome (124.1 s against 123.5 s), and a date index on the causes table so the weekly fold reads only the days that aged out (126.3 s against 121.1 s, records identical). Both reverted. The records-identical comparison works: pass `--exclusive` to the baseline run (`--out base.json --proof-out base-proof.json`) and to the candidate (`--baseline base.json --same-records`); without it the compare refuses with "coordinator-approved timing window". The profile (Montpelier year 4: garbage collection 49 percent of the time) says the large remaining cost is how much the world keeps, not one function.

