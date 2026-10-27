---
id: core-speed-contact-offers-grow-with-ties
title: "Bedford's third year runs twice its first on main with the cause acts fixed: daily choices for a focus set that grows from 20 to 75, each scoring 20 or more cause-act offers"
area: core
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/speed-score-offers-per-kind
pr: #6133
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T08:39:07.376Z
---

**What.** In Bedford, Wyoming (key 5606045, seed 9a4dd331ace7), on main 122c3217c5 merged with #5994 and people-drives-cause-acts-pull-less (branch claude/drives-cause-acts-pull-less), the years run 36.9, 69.0 and 75.6 s (main alone: 39.2, 82.3 and 101.8 s). Two things grow. The people chosen for each day: 11,952 activations in year one, 18,403 in year two and 28,013 in year three, because the focus set goes from 20 to 74 in year two when the player joins cause groups and meets every member (met-in-group ties, owner Oct 10), and focus people choose every day. And the offers each choice scores: 11.9, 21.1 and 42.1, now mostly the cause acts' own offers (join-cause-group 8.7, donate-to-cause 8.0, volunteer-for-cause 4.8, share-cause 3.9 a choice in year three), one per known group or place for each drive a person holds; the contact offers stay near 9 to 15 a choice thanks to the weekly shortlist. Make a later year cost about what the first does with the same choices: score each holder's cause-act offers without the per-group, per-drive repeat, and find whether daily choices for a growing focus set can be priced by what changed.

**Rules.** Speed: a town's year runs in under two minutes and year three within 1.2 times year one; never scan the whole world daily. No dice and sliding scales: who a person contacts stays their own scored choice; no cap or cutoff on whom they may contact. An exact cut keeps the deep fingerprint identical.

**Done when.** In the played world (buildBenchWorld), Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and a place drawn from all 56 (named with its seed), three years each: the deep fingerprint is identical before and after, a CPU profile of year three shows the contact offers' scoring time lower, and the third year's seconds over the first's are reported before and after on one process. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/modules/life.ts, src/core2/modules/people.ts, src/core2/closeness.ts, src/core2/choice.ts

**Notes.** Filed Oct 25 by the speed lead. Scratch counts: activations and offers per act per year from duePeople and availableActs sampled twice a month; profiles in the speed lead's scratch (year-profiles.mts, incl-diff.py). Related: core-speed-opelika-year-memory-growth (the same focus growth from met-in-group ties).

Oct 25, 15:45 UTC (speed lead): corrected. The first version of this item measured on #5994's head, which predates the weekly contact shortlist on main (5371a8019b); there the contact offers grew from 9.5 to 45 a choice. On main they do not; the numbers above are main's.

Oct 25, 16:00 UTC (speed lead): one exact cut built on `claude/speed-score-offers-per-kind` (a990cb97db, from main 08cbf6a890): `scoreOffers` works the terms that depend only on the kind of act (need, strongest goal, trait lean, feelings) once per kind per call. Deep fingerprints identical: Long Hill, Connecticut (seed m7b, one year) `484513530f7fc869` on both, Stanardsville, Virginia (seed cc91f5444b53bd47, three years) `9f5530e671abfcd6` on both. Paired Long Hill year 137.7 s base, 128.3 s branch (0.932, fingerprints `108df01ba2b0a204` both); in that pair `scoreOffers` itself falls only from 5.0 to 4.4 s. In Bedford's third year on main (98.3 s against 96.4 s with the cut) scoring is 5.3 s of `activate`'s 52.6 s; the rest is performing acts (23.3 s) and building offers (19.5 s) for 32,395 activations, 26,664 of them by the 80 focus people who choose daily. So the band waits on how many people choose each day, not on scoring: whether everyone the player meets in a group joins the daily focus for good (the open question in core-speed-opelika-year-memory-growth).

Oct 25, 16:05 UTC (speed lead), what sets the band. Bedford on main with the drives change, profiled: years 36.2, 66.3 and 71.0 s. Year three adds 36 s to year one: garbage collection +7.3 s (the kept log grows from 12,645 records to 132,496 and events from 4,709 to 25,274), life.ts +5.3, state.ts +5.1, drives +4.8, people +3.0, choice +2.3, decision-detail +1.4. Most of it scales with the focus set, whose acts and reasons are kept and who choose daily. As a measurement only (not built), leaving met-in-group ties out of the focus set keeps it at 42 and 61 people in years two and three and gives 33.4, 59.1 and 61.4 s: better, still 1.84 times. The rest comes from the player's other ties with those members later, and from year two's growth in cause groups and drive holders. A design call, not a cut: which of the player's ties make a person choose daily and keep a full record, and for how long (a tie that fades could hand the person back to their tier's cadence).

Oct 25, 16:10 UTC (speed lead), an option measured for the CTO (prototype, not built): a focus person outside the player's family chooses daily only while their tie with the player had contact in the last 30 days, and otherwise at their own tier's cadence (calendar.ts hasDailyFocus). On main with the drives change, Bedford runs 32.4, 55.4 and 41.6 s: year three is 1.28 times year one (2.05 without it), activations 9,587, 10,958 and 10,480 (flat), the focus set unchanged at 78. Year two's 55 s is the November 2026 election season (core-speed-campaign-season-kept-whys). The rest of the band would come from that item and the scoring cut. The window is a scheduling cadence, like the tiers themselves, not a behavior; the CTO decides whether it fits "sliding scales and causes".

Oct 25 audit: From the dropped core-later-years-slower-drive-holders-offers: its owner question (who a holder contacts) is ruled under "simulate it, don't ask": a holder offers acts only to people whose tie pull can top the day. Its giving finding stands: real donors give a few times a year where the model has them give about 80 (scripts/core2-year/giving-proof.ts).

Sent back 2026-10-26 from PR #6133 (branch claude/speed-score-offers-per-kind): own checked integration 89fce386c37a passes type/static/choice checks, but exclusive same-machine Long Hill year is126.1s versus main100.6s (+25.3%), exceeding120s and+20% limits with matching summary hash; diagnose measured regression and finish on that branch, merge main first.
