---
id: world-counted-claim-pays-after-household-leaves
title: "A counted claimant's in-play retirement award keeps paying the town's residents account after their household moves away"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/counted-claim-household-leaves
pr: #5973
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T19:10:15.459Z
---

**What.** When the counted moves engine moves a household out of town (departCountedHousehold, src/core2/modules/residents.ts:2408), endHouseholdFlows ends only the retirement awards listed in the household's income contracts. An award claimed in play by a counted member is a residents flow named retirement-claim:<person> (src/core2/modules/retirement-claims.ts), which no income contract lists. So it keeps paying the residents account of the town they left. This was identified from the code and has since been reproduced in the generated worlds recorded below. Garland, Tennessee (GOLDEN_PATH_SEED=1811f30aeb17dbb0025e759cc9df15bc, counted-demotion test) has a household that moved away on Nov 1, 2025 as move:out:household_4c1c42413e50aaf8:2025-11-01, but nobody in it had claimed.

**Rules.** One model, two tiers: a counted person's award leaves town with them, as a full person's would. Wire to the world: show it by the flow id and the departure record id in a played world. No dice.

**Done when.** A played year in a drawn place, or a named seed, where a counted claimant's household moves away shows their retirement-claim flow ended on the move date, named by flow id and the move:out record id. The retirement-claims and counted-moves tests pass, and the fix fails its test when undone.

**Files.** src/core2/modules/residents.ts, src/core2/modules/retirement-claims.ts, src/core2/modules/counted-moves.ts

**Notes.** Found Oct 24 while working tests-counted-demotion-retained-cash.

October 24, 2026 (claude, claude/counted-claim-household-leaves): fixed. A counted household's departure (endHouseholdFlows in src/core2/modules/residents.ts) now also ends each member's own award claimed in play, retirement-claim:<person> or its :counted: successor, with reason household-left. Shown in East Syracuse, New York (COUNTED_CLAIM_SEED=bdae3daaf7847b71, attempt 1): retirement-claim:person_d54a14d076791975 ended on 2026-02-01, the day of move:out:household_71ee38715070e75d:2026-02-01. Test: src/core2/counted-claim-departure.test.ts.

Merger 1 independently checked the exact 365-day world on fresh root 8980a0b7187a136b: Loris, South Carolina (4542730), attempt 4; 3 of 218 tracked claims left with their household. retirement-claim:person_f2d3a877224050a6 ended on 2025-04-01, matching move:out:household_f00734129d6074ec:2025-04-01. The new test now clamps each 28-day step to the year end, rather than running 392 days. Reversing only the residents fix on the identical seed makes that same flow fail: expected undefined to be 2025-04-01; the checked source was restored byte for byte. Own type/static/11 tests passed, and pool findings match main.
