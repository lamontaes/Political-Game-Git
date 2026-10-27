---
id: people-unplanned-carry-end-calibration
title: "Calibrate the carry-or-end weights of an unplanned pregnancy against the published split in played years"
area: people
kind: research
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a couple that chose to wait has an unplanned pregnancy, src/core2/births-unplanned.ts decideUnplanned weighs carrying it against ending it with four TUNABLE sizes whose spreads are unmeasured: renewalUnplannedAcceptance (0.5, the pull toward carrying a begun pregnancy), renewalEndingBase (1, what ending weighs apart from travel), renewalTravelWeight (2) and renewalTravelHalfMiles (how hard the distance to the nearest provider weighs), all in src/core2/data/renewal/parameters.json under the open stopgap SG-PEOPLE-unplanned-coefficients. Play a batch of drawn towns for a year, compare the share of unplanned pregnancies carried and ended (full and counted) with the published split, and how that share falls with distance to a provider, and set the four sizes and their spreads from the comparison. The exposure size itself is people-unplanned-exposure-calibration.

**Rules.** Research before building: the published split checks the town's totals and never picks a couple; each mother's choice stays a read of her own record, her household's money and the law and provider distance where she lives. Estimate, never UNKNOWN: each parameter keeps a labeled spread from the measured batch. One rule, all 56 places: towns are drawn from all 56 and named with their seeds.

**Done when.** In at least six drawn places, each a one-year played world built with buildBenchWorld, the share of unplanned pregnancies ended falls within the recorded spread around the fetched published figure, and the ended share falls with distance to the nearest provider as the fetched distance study reports; the four parameter rows name their sources with quotes and measured spreads, SG-PEOPLE-unplanned-coefficients is resolved once people-unplanned-exposure-calibration has also landed, and the PR names each place and seed.

**Files.** src/core2/data/renewal/parameters.json, src/core2/births-unplanned.ts, src/core2/data/stopgaps.json, data/research/people/

**Notes.** Filed Oct 24, 2026 from the merger's send-back of PR 5749 (claude/provider-distance): the five unplanned coefficients pointed at the resolved SG-PEOPLE-unplanned-pregnancy; the fixer registered SG-PEOPLE-unplanned-coefficients, whose replacement names this item and people-unplanned-exposure-calibration. Dropped the same day: a duplicate of people-unplanned-calibration, filed by the session that fixed PR 5749 first.
