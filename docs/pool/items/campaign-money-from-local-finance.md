---
id: campaign-money-from-local-finance
title: "A council campaign raises money the way local races do: about $75 to $720 an hour of call time, gifts near a $50 median"
area: elections
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: governing/campaign-money-calibrated
pr: #7062
blocked-on:
source: governing lead, Nov 1 (the money unit of campaign-like-real-races, phase A of docs/work-orders/governing-2026-10-29.md)
lead: governing
claimed-at: 2026-11-01T21:33:42.974Z
---

**What.** In played runs a council campaign raised $12 to $258 over 4 to 21 weeks of weekly donor-call evenings, so the player could not pay for a forum (campaign $59, venue $347.55). The donor's answer (`donationAnswer` and `giftBudget` in src/core2/modules/campaigns.ts) asked for cash beyond a cushion of living costs and never read the month's income. Make a gift come from what the donor has to spare in the month after taxes and bills, plus a small share of savings, sized by their warmth to the candidate, and calibrate it to local campaign finance: call time yields about $290 an hour (75 to 720), mean contribution $144 (72 to 288), median $50 (26 to 125).

**Rules.** No dice: a gift follows the donor's own money, ties and views, never a roll. Estimate, never UNKNOWN: every new number is ESTIMATED or TUNABLE with its source and spread in src/core2/data/campaigns/parameters.json. One rule, all 56 places: the bands hold over pools of drawn places from all 56. One model, two tiers: a counted donor answers by the same rule.

**Done when.** src/core2/campaign-money-calibration.test.ts holds all three bands on a pool of 16 places drawn from all 56, on at least four fresh run seeds named in the PR body; a resampled failure rate at 16 places under 0.5% on held-out seeds; and every shortcut left (donors with no recorded living cost) is a registered stopgap.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json, src/core2/campaign-money-calibration.test.ts, src/core2/data/stopgaps.json

**Notes.** Built on governing/campaign-money-calibrated (Oct 30 to Nov 1, three review rounds). The bands lean on SG-GOV-gift-no-living-costs until people-press-staff-households gives paid press staff a living cost.
