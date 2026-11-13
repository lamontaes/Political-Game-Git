---
id: traits-donate-reasons-too-flat-in-some-towns
title: "Giving reads too little of each person's circumstances: in Lyndon Center, Vermont the odds ratio by openness is 8.2 against the study's 1.8, and half of all contacts say yes"
area: people
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: haiku
effort: low
root: none
source: red main (checker), Oct 30; lead set to governing by the CTO (folded into the campaign money calibration)
lead: governing
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-traits-donate-reasons-too-flat-in-some-towns
---

**What.** src/core2/modules/campaigns.traits.test.ts 'giving follows openness at about the researched rate' fails by draw on clean main (b216577): GOLDEN_PATH_SEED=chk2-c, Lyndon Center, Vermont (5041800), race 2025-03-04: campaigns.donate odds ratio 8.18 against a target of 1.82 and a bound of 4.01. Measured on the same calls: Lyndon Center has 2104 calls, 357 distinct reason totals all near zero (the biggest pile is 45), and 57.5 percent say yes; the personality weight is 0.071, so with the circumstances barely varying temperament alone sorts who gives. Elberta, Michigan (chk2-a): 1612 calls, 600 distinct totals, 52.5 percent yes, odds ratio 1.62, inside the band. So the donate choice does not read enough of a person's money, ties and the race to vary the reasons, as the volunteering test's own comment says of that choice (data/content/trait-decision-gaps.json). A share of about half of contacts giving is also far above real giving. Guards: who gives to the player's campaign, which this test keeps right.

**Cause.** Measured: does not reproduce on main d64255aa (Nov 11). `GOLDEN_PATH_SEED=<seed> npx vitest run src/core2/modules/campaigns.traits.test.ts -t "giving follows openness"` passes in five towns: chk2-c (Lyndon Center, Vermont, 5041800), odds ratio 1.60; chk2-a (now Tiki Gardens, Hawaii, 1570280; the draw moved off Elberta), 1.23; the default draw (Soso, Mississippi, 2869160), 1.81; ed98ee0aafc41a65 (Grass Range, Montana, 3032575), 2.23; be690728cd6303f3 (Santa Cruz, California, 0669112), 1.27. A temporary probe in the test (undone) counted the reasons: 355 distinct totals in 477 calls in Lyndon Center (the biggest pile is 10 calls, against 45 in 2,104 before), and 627 to 1,635 distinct totals elsewhere. So the reasons are no longer flat. `donorReason` in src/core2/modules/campaigns.ts now reads the donor's spare money (`spareAgainstGift`, weight `donorMeansWeight`) beside warmth, platform, party and the tie. The share of calls whose reasons are above zero runs 23 to 67 percent by town. That is not the share who give: `donationAnswer` then also needs spare cash and a whole dollar. The repository has no sourced share of asked people who give, and the item never had one.

**Fix.** Nothing to build. The CTO drops the item as done by main. If the giving test fails again by seed, file a new item from that run's place, seed and odds ratio.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** No dice: the reasons are the person's money, ties, views and the race, never a seeded pick. Every number a sourced or estimated parameter; the researched share of contacted people who give is read from a source, not typed. One rule, all 56 places: a flip by seed is a defect, so the fix makes the odds ratio hold across drawn towns. Never widen the test's 2.2 slack or skip it.

**Done when.** A second session runs the giving test in src/core2/modules/campaigns.traits.test.ts with GOLDEN_PATH_SEED=chk2-c, chk2-a and three seeds it chose in drawn places (named); it passes on all of them, the reasons differ person to person in the played calls (distinct reason totals reported against the 357 of 2104 calls before), and the share of contacted people who give is reported beside the sourced share.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/campaigns.traits.test.ts, data/content/trait-decision-gaps.json

**Notes.** lead: traits. Found by the standing red-main owner Oct 30 03:20 UTC from Checker 2's report; not fixed by the red-main owner because the fix is a calibration needing a sourced giving share and a reading of the person's own money, not a test change. Read: OWNER-DECISIONS (no dice, estimate-not-unknown), searched docs/pool/items for campaigns.donate and giving follows openness: none.

Nov 1 evidence (governing lead, review of governing/traits-endorsements-heard, head ed93f41c81, main also red): GOLDEN_PATH_SEED=chk2-c, Lyndon Center, Vermont (draw :0): campaigns.donate odds ratio 4.39 against the bound of 4.01, so the giving case still fails there (it read 8.18 on main b216577 on Oct 30). The same run's running-for-office case is a separate item, tests-campaigns-traits-run-ratio-cruz-bay (Cruz Bay, U.S. Virgin Islands, seed a4eca5af1791dc3df7527d94791fb774b3fcdd52 draw :0).

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:46 UTC) on branch claude/pool-traits-donate-reasons-too-flat-in-some-towns.

Released (2026-11-11): The giving test passes on main with chk2-c and chk2-a; marking its Cause Needs cause (PR 8535). Continue on branch claude/pool-traits-donate-reasons-too-flat-in-some-towns.

Nov 11 (cause finder for Fable B): the giving test passed in five drawn towns on main d64255aa, with odds ratios from 1.23 to 2.23 against the band. The reasons vary person to person (355 to 1,635 distinct totals; the biggest pile is 10 to 30 calls). The donor reason now reads the donor's spare money. I propose dropping the item as done by main. Measuring the give share against a source would be a new research item, and only if a playtest shows the player's asks landing too often.
