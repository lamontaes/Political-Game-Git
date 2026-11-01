---
id: traits-donate-reasons-too-flat-in-some-towns
title: "Giving reads too little of each person's circumstances: in Lyndon Center, Vermont the odds ratio by openness is 8.2 against the study's 1.8, and half of all contacts say yes"
area: people
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: red main (checker), Oct 30; lead set to governing by the CTO (folded into the campaign money calibration)
lead: governing
---

**What.** src/core2/modules/campaigns.traits.test.ts 'giving follows openness at about the researched rate' fails by draw on clean main (b216577): GOLDEN_PATH_SEED=chk2-c, Lyndon Center, Vermont (5041800), race 2025-03-04: campaigns.donate odds ratio 8.18 against a target of 1.82 and a bound of 4.01. Measured on the same calls: Lyndon Center has 2104 calls, 357 distinct reason totals all near zero (the biggest pile is 45), and 57.5 percent say yes; the personality weight is 0.071, so with the circumstances barely varying temperament alone sorts who gives. Elberta, Michigan (chk2-a): 1612 calls, 600 distinct totals, 52.5 percent yes, odds ratio 1.62, inside the band. So the donate choice does not read enough of a person's money, ties and the race to vary the reasons, as the volunteering test's own comment says of that choice (trait-decision-gaps.json). A share of about half of contacts giving is also far above real giving.

**Rules.** No dice: the reasons are the person's money, ties, views and the race, never a seeded pick. Every number a sourced or estimated parameter; the researched share of contacted people who give is read from a source, not typed. One rule, all 56 places: a flip by seed is a defect, so the fix makes the odds ratio hold across drawn towns. Never widen the test's 2.2 slack or skip it.

**Done when.** src/core2/modules/campaigns.traits.test.ts giving test passes with GOLDEN_PATH_SEED=chk2-c and chk2-a and on three fresh drawn places named in the PR body with their seeds, each reporting the odds ratio within the band and the yes share near the researched share of contacted people who give, by the played calls' count

**Files.** src/core2/modules/campaigns.ts,src/core2/modules/campaigns.traits.test.ts,src/core2/data/trait-decision-gaps.json

**Notes.** lead: traits. Found by the standing red-main owner Oct 30 03:20 UTC from Checker 2's report; not fixed by the red-main owner because the fix is a calibration needing a sourced giving share and a reading of the person's own money, not a test change. Read: OWNER-DECISIONS (no dice, estimate-not-unknown), searched docs/pool/items for campaigns.donate and giving follows openness: none.
