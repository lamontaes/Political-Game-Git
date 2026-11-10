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
source: governing lead, Nov 2 (the money refit after people-press-staff-households; CTO option 1, OWNER-DECISIONS e53a83c7e1)
lead: governing
standard: 2
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** Over 101 run seeds' recorded donor asks (808 places, Nov 2), only about 22% of asks reach someone whose own reason to give (donorReason in src/core2/modules/campaigns.ts) is above zero, and about 9% give. Call Time 101 (already cited in donationShareOfMonthPerWarmth) has about 10 contacts and 3 to 5 gifts an hour, a third of contacts. Because so few have a reason, poor towns raise under the $75 an hour floor while rich towns' median gift passes $125, and the money test needs 32 places to hold its bands (CTO option 1, OWNER-DECISIONS e53a83c7e1). Refit the reason terms (donorSpareGiftsAtEven, donorMeansWeight and the warmth, agreement, party and tie weights) against a gift rate per contact from research, recording the asks again for each candidate set, so that more people give smaller gifts. Feeds: campaign-like-real-races; the money a campaign raises on the Campaigns screen.

**Cause.** Measured: over the recorded donor asks of 101 run seed draws (808 places, Nov 2), only about 22% of asks reach someone whose own reason to give (`donorReason`, src/core2/modules/campaigns.ts line 3157) is above zero, and about 9% give; Call Time 101 finds about a third of contacts give. The recording kit is described in the governing-measurement skill under fitting a parameter against bands over drawn places.

**Fix.** Refit the reason terms (donorSpareGiftsAtEven, donorMeansWeight and the warmth, agreement, party and tie weights in src/core2/data/campaigns/parameters.json) against a sourced gift rate per contact, using a fit half and a held-out half of the recorded asks. Never widen the bands.

**Time box.** 8 hours for an Opus session.

**Rules.** No dice: whether someone gives follows their own reasons, traits and money, never a roll. One model, two tiers: counted residents are asked and answer by the same rule times their count. Research before building: the gift rate per contact is sourced, then the bands are refit, never widened.

**Done when.** A second session, in two drawn places (a poor town and a rich one, seeds printed), runs a filed candidate's call time in the played world and sees more of the people asked have a reason to give than the 22% measured on Nov 2, with each gift naming its donor and reason terms by record id. The sourced gift rate per contact and the measured share are printed in the PR as figures to report, not targets. src/core2/campaign-money-calibration.test.ts passes on the held-out half of the recorded asks, with the fit and held-out halves named in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json, src/core2/campaign-money-calibration.test.ts

**Notes.** Nov 2 (governing lead): the recording kit (a scratch recorder test that writes each ask's budget and reason, and a replay that resamples place pools) is described in governing-measurement under Fitting a parameter against bands over drawn places.
