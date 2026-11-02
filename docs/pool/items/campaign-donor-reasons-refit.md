---
id: campaign-donor-reasons-refit
title: "More of the people a campaign reaches have a reason to give, as call time finds"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-press-staff-households
source: added with npm run pool -- add
---

**What.** Over 101 run seeds' recorded donor asks (808 places, Nov 2), only about 22% of asks reach someone whose own reason to give (donorReason in src/core2/modules/campaigns.ts) is above zero, and about 9% give. Call Time 101 (already cited in donationShareOfMonthPerWarmth) has about 10 contacts and 3 to 5 gifts an hour, a third of contacts. Because so few have a reason, poor towns raise under the $75 an hour floor while rich towns' median gift passes $125, and the money test needs 32 places to hold its bands (CTO option 1, OWNER-DECISIONS e53a83c7e1). Refit the reason terms (donorSpareGiftsAtEven, donorMeansWeight and the warmth, agreement, party and tie weights) against a gift rate per contact from research, recording the asks again for each candidate set, so that more people give smaller gifts.

**Rules.** No dice: whether someone gives follows their own reasons, traits and money, never a roll. One model, two tiers: counted residents are asked and answer by the same rule times their count. Research before building: the gift rate per contact is sourced, then the bands are refit, never widened.

**Done when.** Over the recorded asks of at least 100 run seeds (fit and held-out halves named in the pull request body), the share of asks that end in a gift sits within the sourced rate per contact, and src/core2/campaign-money-calibration.test.ts holds its bands with 16-place pools failing under 0.5% on the held-out half.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json, src/core2/campaign-money-calibration.test.ts

**Notes.** Nov 2 (governing lead): the recording kit (a scratch recorder test that writes each ask's budget and reason, and a replay that resamples place pools) is described in governing-measurement under Fitting a parameter against bands over drawn places.
