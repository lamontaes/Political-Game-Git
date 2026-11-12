---
id: core-speed-colorado-election-year-persuasion
title: "Upper Witter Gulch election year: campaign events and the stance they move take most of the year"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #8418
after:
blocked-on:
model: opus
effort: high
root: rc5-full-detail-every-day
lead: speed
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-speed-colorado-election-year-persuasion
---

**What.** Upper Witter Gulch, Colorado (0879800, seed 5a1c0de7a11ce5e1), year 4 with the profiler on: 182 s, of which 146 s is the day loop. Campaign work is 50 s (campaignTurn 37 s; takeCampaignDayChoice 21 s, nearly all holdEvent 17 s), applying each event to listeners costs 20 s (the views engine's onEvent 9 s: stanceAfterCase 4.1 s, standingWith 1.4 s, putOwned 1.6 s; drives onEvent 4.3 s; life onEvent 2.3 s) and the collector 36 s. Unprofiled, main's year 4 is within noise of the 120 s bar (121.1 s on Nov 8; Gunnison's Nov 9 profile puts it near 117 s). This item also takes two finished leads from items now merged here: monthlyIncome (src/core2/modules/credit.ts line 1179) shows 5.6 s of self time and 3.2 s in its callback though a person-to-jobs index changed nothing, and the door contacts' weighed rows (Montpelier, Vermont, 5046000, same seed) were cut from 106,628 to 41,904 at day 100 without shortening year 4, but campaign-turn and the donor meeting read a guest's kept weighed record, so any cut must keep it one day.

**Cause.** Needs cause. No longer over the bar on main 0afb9a2262 (opus-5251, Nov 11, PR #8418): `npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1 --years 4 --exclusive` gave years of 39.5, 61.0, 41.9 and 63.4 s. For the CTO to drop or re-aim. The earlier measurement: Upper Witter Gulch, Colorado (0879800, seed 5a1c0de7a11ce5e1), `npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1`, year 4: 182 s profiled, campaign work 50 s (campaignTurn 37, takeCampaignDayChoice 21, holdEvent 17), applying events to listeners 20 s (views onEvent 9, drives onEvent 4.3, life onEvent 2.3), collector 36 s; also monthlyIncome (src/core2/modules/credit.ts line 1179) 5.6 s self time though a person-to-jobs index changed nothing, and Montpelier's weighed-row cut (106,628 to 41,904 rows) did not shorten year 4.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. No dice. A cut must keep the same records (`npm run speed:year -- --same-records`, with `--exclusive` on the baseline). Keep what the player's circle reads (CTO, Nov 5). One model, two tiers: a rally's listeners move by the rule a person does, times the count.

**Done when.** A second session, not the builder, runs `npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1` on the same machine as the base and year 4 stays under the 120 s bar with `--same-records` passing; the PR names each cut by function and the seconds it saved. The year is a played world on that place and seed, and its record fingerprints stay unchanged.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/modules/drives.ts, src/core2/modules/credit.ts, src/core2/why-kept.ts, src/core2/decision-detail.ts

**Notes.** Profile by State Sessions Nov 6 (scripts/speed-years/profile.mjs on a Profiler session around year 4). Ideas, not tried: a person's persuasion lean (decisionLean in stanceAfterCase) is the same for every event, so read it once; a rally's listeners could be one counted group with one move; fewer rows kept so the collector has less to scan.

Astra, Nov 7: Hidden Springs, Idaho (`1637500`), replay `4656597f8770bfac`, host `19940a91b8a7`. Election-year-only CPU profile at `9e18653fe4346d12227442846d81784a10163763` (the #7336 fix, now merged). All four record fingerprints match the corrected law-levels timing run at `3a49175ae94aa863357ea10ea4aa8f9b6c0c8e7d`; year 4 digest: `33aa959c831a0d95`.

Inclusive sampled time: `campaignWork` 50.601 s, `campaignTurn` 40.276 s, `holdEvent` 21.029 s, `makeStatements` 16.528 s; `pressWeek` 15.417 s; garbage collection 15.218 s. These overlap and must not be added. Law readers are small: `lawInForce` 0.203 s, `lastEnactment` 0.208 s, `lawRows` 0.208 s; `holdCommittee` 3.113 s and world-legislating `onWork` 1.945 s. A law-reader cache cannot recover the roughly 8 s final-year shortfall from those reads alone. Astra leaves campaigns, electorate and views to State Sessions.

The separate unprofiled four-year run took 86.3, 166.3, 103.9 and 191.0 s against the assignment baseline of 81.2, 156.2, 92.5 and 174.8 s: all four miss its 5% cumulative bar. The profile and reproduction are in [PR #7335](https://github.com/lamontaes/Political-Game-Git/pull/7335). This adds a second place to the existing campaign/persuasion evidence; it does not change this item's finish line.

Nov 8 (State Sessions): where the year stands and what did not help. Clean runs of `npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1 --years 4 --exclusive` on main: year 1 47.1 s, year 2 95.9 s, year 3 56.7 s, year 4 121.1 s (a run an hour earlier on the same code gave 123.5 s and another 128.4 s, so the machine moves it by about 5 percent: the bar is within the noise today). Tried and measured, no gain: a person-to-jobs index for monthlyIncome (124.1 s against 123.5 s), and a date index on the causes table so the weekly fold reads only the days that aged out (126.3 s against 121.1 s, records identical). Both reverted. The records-identical comparison works: pass `--exclusive` to the baseline run (`--out base.json --proof-out base-proof.json`) and to the candidate (`--baseline base.json --same-records`); without it the compare refuses with "coordinator-approved timing window". The profile (Montpelier year 4: garbage collection 49 percent of the time) says the large remaining cost is how much the world keeps, not one function.

Nov 8 (State Sessions), rally listeners as a group (CTO order 1): measured, and there is nothing to group. A CPU profile of Upper Witter Gulch year 4 on main (profile run 192 s, which is the profiler's overhead) puts a speech's audience at 9.1% of the year (`makeStatements`), of which 6.7% is the speech step and 0.9% the campaign engine's own retelling. Inside the speech step 5.0% is the shared event path that each witness runs on their own (views 0.7% at most for any one call, drives, observations, table writes), and 0.4% each listener's own keep-or-retell choice. No call is above 0.7% of the year, and each listener's cost comes from their own stance, traits and household, so no two listeners share an input. Grouping them would need a result cache keyed on every one of those inputs, which saves under a second and puts the rule ("each person gets exactly the result they'd get alone") at risk. Not built. The year's biggest single cost is memory work: the garbage collector is 25% of the profile, which is the same cause as Montpelier's year 4 (`core-speed-montpelier-snap-scope-memory`).

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 01:13 UTC) on branch claude/pool-core-speed-colorado-election-year-persuasion.

Released (2026-11-11): Year 4 is 63.4 s on main 0afb9a2262 (bar 120 s); nothing to cut (PR #8418). Continue on branch claude/pool-core-speed-colorado-election-year-persuasion and pull request #8418.

Nov 11 (CTO): the Fix above is set to the standard text because the Cause now reads "Needs cause." The fix written before the cause stopped reproducing, kept for whoever finds the new cause: Re-measure year 4 on current main first. Then cut by profile only: read a person's persuasion lean (`decisionLean` in `stanceAfterCase`, src/core2/modules/views.ts line 831) once per event, apply a rally to its listeners as one counted group, and find from where and how often `monthlyIncome` is called (src/core2/modules/credit.ts line 1302 builds it lazily per household) and what its 3.2 s callback is before indexing jobs. Any cut that drops a door-only contact's kept weighed record must keep it for one day, because campaign-turn and the donor meeting read it. Every cut keeps `--same-records`.
