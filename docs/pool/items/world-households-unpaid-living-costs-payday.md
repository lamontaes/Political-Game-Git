---
id: world-households-unpaid-living-costs-payday
title: "In a small Kansas town half of the outside living costs go unpaid: households hold no cash on the 1st"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/living-costs-arrears
pr: #4937
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:21:06.345Z
---

**What.** In the Kansas town 2066800 (seed `2306dfeab28a671ff9038220bafccf437091cef03806fb4a480b836d00be3524`, bench world, two-level, from 2025-01-01) the households paid only 48 percent of their outside living costs in the first 3 months: $35,459 asked, $17,099 paid, $18,360 unfunded, and no household borrowed. Of the town's 38 full people, 12 hold exactly zero cash and 9 of those have jobs; 9 of the 35 who work sit at 0 on a given day. The living cost is charged on the 1st from cash on hand, so a worker whose pay arrives later in the month pays nothing that month, and the cost is dropped (the counted side keeps arrears only for housing). Give a living cost a household could not pay the same treatment as housing: carry it as arrears into the next payday, or draw on the credit the household has, so what is asked is paid when money arrives.

**Rules.** Every dollar balances. No dice: the household's cash and pay decide. One model, two tiers: the counted groups and full people follow the same rule.

**Done when.** In a drawn town (name place and seed), the share of outside living costs paid over 90 days is at least 85 percent of what was asked for households that earn, and `src/core2/service-charges.test.ts` passes on that seed with its tolerance of 15 percent unchanged; the unfunded line in `finance.totalsByKind` for `household.outside-living-costs` is read by a test. The owner plays it: a town's charges and fees reach its treasury at the budget's figure.

**Files.** src/core2/modules/residents.ts, src/core2/counted-money.ts

**Notes.** Found triaging a failing `service-charges.test.ts` (US-KS, expected 322358 to be less than or equal to 109871 for the state government's row). The government's receipt is the share of what households actually paid, so it falls short in the same proportion. Until this lands that test draws again when the households paid under 85 percent of what they were asked.

Sent back 2026-10-18 from PR #4937 (branch claude/living-costs-arrears): Merging current main (a5956a1219) conflicts in docs/pool/items/world-households-unpaid-living-costs-payday.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
