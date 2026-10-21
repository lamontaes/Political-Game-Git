---
id: gov-campaign-day-donor-reason-test
title: "The campaign day money check counts only donors whose own reasons are above zero (Washington, District of Columbia)"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/campaign-day-donor-reason
pr: #4827
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T21:24:00.977Z
---

**What.** The campaign day test (`src/core2/campaign-day.test.ts`) fails on main in Washington, District of Columbia (golden-path seed 7a84683440ff9120554df04e9146fc8de95df4e8a716dcb2fd79264fcac25df4): 14 reachable adults had cash beyond their cushion and the candidate raised nothing. The test assumed that anyone with spare cash can give, but giving is the donor's own choice: `askForDonation` gives only when the donor's reasons (warmth, agreement, party, relationship and trait lean) are above zero. Those 14 had no such reason, so asking them rightly raised nothing. `donorReason` is now one exported function that `askForDonation` and the test both read, and the test counts only donors whose reasons are above zero.

**Rules.** No dice: giving follows the donor's reasons. Replace, never layer: one function holds the reason sum. One rule, all 56 places.

**Done when.** In the played world (the campaign day test with the seed above, Washington, District of Columbia) the test passes: where a reachable adult has cash and reasons above zero, the asks raise money, and where none does they raise none.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.test.ts

**Notes.** Found by running all of src/core2 on main (Oct 16); the earlier item gov-campaign-day-no-money-small-town fixed the town with nobody who could give.
