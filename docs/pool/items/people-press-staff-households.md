---
id: people-press-staff-households
title: "A press person who lives outside town gets a real household with rent, living costs and kin"
area: people
kind: stopgap
priority: 3
size: S
status: done
claimed-by: governing/press-staff-households
pr: #7135
blocked-on:
source: added with npm run pool -- add
lead: governing
claimed-at: 2026-11-01T23:54:24.940Z
---

**What.** src/core2/press-staff.ts seats an out-of-town press person alone, with no rent, living costs or family, because the identity fill-in makes a person without a home. Draw their household as the opening draws any household of their age and pay, with rent, living costs and kin. Closes SG-PEOPLE-press-staff-households.

**Rules.** One model, two tiers: the press person's household follows the same household draw as any other. Estimate, never UNKNOWN: their costs start from the real average for their pay.

**Done when.** In a one-year run of the played world (buildBenchWorld, drawn place and seed named), an out-of-town station news director's household record holds a rent and living-cost flow by id, checked in src/core2/press-staff.test.ts.

**Files.** src/core2/press-staff.ts, src/core2/press-staff.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): the row SG-PEOPLE-press-staff-households stays open while its pool items are done.

Nov 1 evidence (governing lead, campaign money round three on governing/campaign-money-calibrated, head ba1b2f37a6): over 408 drawn places, the press staff seated by the identity fill-in with no living cost made 631 of 10,990 campaign gifts but 44.6% of the money ($843k of $1.89M; median gift $1,200, top $5,049), because a donor with no recorded cost weighs a gift one for one against cash (stopgap SG-GOV-gift-no-living-costs, campaigns.ts `weighedAgainst`). The quickest part of the fix is where they are seated: `seatStaff` in press-staff.ts already calls `giveLivingCost` (official-living.ts) for owners; paid staff could get the same at their pay. When this lands, SG-GOV-gift-no-living-costs closes and the campaign money test (src/core2/campaign-money-calibration.test.ts) is refit, because with those donors weighed at the town's median month the best share leaves 3.3% of sixteen-place pools outside a band.

Nov 2, 01:40 (governing lead): branch governing/press-staff-households at 2704262d22, on #7062's head 02aec50404. Done: everyone the press engine seats from a recorded identity gets giveLivingCost and spends it weekly; SG-GOV-gift-no-living-costs is resolved and its one-for-one branch deleted; src/core2/press-staff.test.ts passes (Petersville, Alaska, seed pst-1), and press-staff-cash and press-staff-households pass on pst-1 and pst-2. Next, by the CTO's option 1 (OWNER-DECISIONS e53a83c7e1): set donationShareOfMonthPerWarmth to 2.1 and donationMonthScaleMonths to 0.115, draw 32 places in src/core2/campaign-money-calibration.test.ts with the bands unchanged, and name in the citations the fit half (51 run seeds, 408 places: 3.1% of 16-place pools out, 0.13% of 32-place) and the held-out half (50 seeds, 400 places: 3.7% and 0.22%) and the press people's 9.5% of the money (was 44.6%); run the money test on fresh seeds; open the PR once #7062 merges, its body in three sections (press households, refit, the fit and held-out table). File the donor reason-terms refit (about 22% of asks reach someone with a reason to give) as its own item, lead governing.
