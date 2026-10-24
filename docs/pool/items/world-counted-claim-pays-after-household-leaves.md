---
id: world-counted-claim-pays-after-household-leaves
title: "A counted claimant's in-play retirement award keeps paying the town's residents account after their household moves away"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When the counted moves engine moves a household out of town (departCountedHousehold, src/core2/modules/residents.ts:2408), endHouseholdFlows ends only the retirement awards listed in the household's income contracts. An award claimed in play by a counted member is a residents flow named retirement-claim:<person> (src/core2/modules/retirement-claims.ts), which no income contract lists. So it keeps paying the residents account of the town they left. This is read from the code and not yet shown in a run. Garland, Tennessee (GOLDEN_PATH_SEED=1811f30aeb17dbb0025e759cc9df15bc, counted-demotion test) has a household that moved away on Nov 1, 2025 as move:out:household_4c1c42413e50aaf8:2025-11-01, but nobody in it had claimed.

**Rules.** One model, two tiers: a counted person's award leaves town with them, as a full person's would. Wire to the world: show it by the flow id and the departure record id in a played world. No dice.

**Done when.** A played year in a drawn place, or a named seed, where a counted claimant's household moves away shows their retirement-claim flow ended on the move date, named by flow id and the move:out record id. The retirement-claims and counted-moves tests pass, and the fix fails its test when undone.

**Files.** src/core2/modules/residents.ts, src/core2/modules/retirement-claims.ts, src/core2/modules/counted-moves.ts

**Notes.** Found Oct 24 while working tests-counted-demotion-retained-cash.
