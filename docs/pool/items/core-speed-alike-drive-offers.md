---
id: core-speed-alike-drive-offers
title: "An activation scores one of each set of alike drive offers, not one per cause group (Bedford year three: 290,000 of 911,000 offers)"
area: core
kind: bug
priority: 1
size: S
status: dropped
claimed-by: claude/speed-alike-offers
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T02:07:51.484Z
---

**What.** In Bedford, Wyoming's third played year a person choosing what to do weighs 55 offers on average, against 12 in the first, and 290,000 of the year's 911,000 offers are joining, donating to or volunteering for one of many cause groups on the same drive. Those offers read nothing of the group they name (the act has no reason binding), so for one act and one drive they score exactly alike, and the chooser and the free-time plan always take the lowest-keyed one. Score only that one for a chooser whose scores are not kept (not the player, the focus, a controlled person or the observer), so who does what stays the same.

**Rules.** No dice: who does what for the same causes stays exactly the same, by record id. Speed: a later year runs within 20 percent of the first, measured before and after on the same machine, one process at a time. One model, two tiers: the rule reads only the offers, the same for every person.

**Done when.** In the played world (buildBenchWorld) Bedford, Wyoming (key 5606045, seed 9a4dd331ace7) and Stanardsville, Virginia (seed cc91f5444b53bd47) three years each, and Long Hill, Connecticut (seed m7b) one year, keep an identical deep fingerprint (every person's money and acts, the kept log, ties and journal totals) before and after, with the offers per activation and the three year times before and after in the PR body; the life and drives tests pass.

**Files.** src/core2/life.ts

**Notes.** Filed Oct 24 by the speed lead, part of speed-year-three-within-band and core-later-years-slower-drive-holders-offers. An earlier exact attempt (Oct 20) made the same cut and did not move the time because contact offers dominated then; on today's main the alike drive offers are a third of year three's.

Not shipped yet, Oct 24 (speed lead): inside the noise. Exact (Bedford, Stanardsville and Long Hill deep fingerprints identical to main; the life, drives, choice and contact-frequency tests pass, 8 files, 51 tests). Offers scored per activation in Bedford, Wyoming (seed 9a4dd331ace7), counted in `activate` on base 185d76d7ce: 11.46, 22.59 and 45.38 on main against 10.90, 21.16 and 39.91 with the change (5, 6 and 12 percent fewer), with the same 12,676, 13,399 and 16,505 activations. Scoring is about 4 s of the third year, so the saving is about half a second; the paired run's 0.976, 0.978 and 0.960 are inside the noise (two Long Hill pairs of one other change read 0.941 and 1.005). Branch `claude/speed-alike-offers` is merged with main and pushed; take it if a later cut in the chooser makes it count.

Profiled, Oct 24 (speed lead): a paired Bedford run of three years with the CPU profiler, both checkouts in one process, splits by file path: `scoreOffers` 14.2 s on main against 13.7 s with the change over the three years, and `withoutAlikeOffers` itself costs 0.3 s, so the net is about 0.2 s. Recommend the CTO drop this item. (The same pair read 0.936 in year one, where both sides do the same work, so a single pair's whole-year ratio can be off by about 6 percent under load.)
