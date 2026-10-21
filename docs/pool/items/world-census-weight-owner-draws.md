---
id: world-census-weight-owner-draws
title: "Owner draws of counted owners stand for as many households as the town's weight says"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5306
blocked-on: world-census-scaled-establishments-short
source: added with npm run pool -- add
claimed-at:
---

**What.** In Washington, D.C. opened at 69 times its sample (seed `big1`), a 30-day look at what enters and leaves the counted groups' funds, by journal source (a wrapper on `api.postJournal` summing postings to the `rt.funds` accounts), shows lines that do not track the weight. Per person in the town: owner draws are $11.7 against $427 in the small town (36 times too low), counted wages $26.5 against $170 (6 times; the hiring item in PR 4784 covers wages), retirement pay $143 against $307, and purchases $71 against $95. Rent, mortgage, outside living, unplaced wages and property tax now match the small town to within about 10 percent. Find why each line is short (the owner-draw flow and its payer's books first: `owner-draw:` entries in `src/core2/modules/business.ts` or `residents.ts`) and weight it, one line at a time.

**Rules.** One model, two tiers: the same dollars per household, times the count. Every dollar balances. No dice.

**Done when.** In a drawn town above 10,000 opened at its Census scale (name place and seed), the owner-draw line per town resident is within 25 percent of the default-size town's over 30 days, and a test beside `counted-weight-money.test.ts` states it. File the other short lines (retirement, purchases) as their own items if they are not the same cause.

**Files.** src/core2/modules/business.ts, src/core2/modules/residents.ts

**Notes.** Found measuring the uncapped opening (core-census-uncap-opening) after PR 4862 (unplaced wages and the groups' bank deposits).

Looked at Oct 17 (claude/owner-draws-weighted-s5), not built, and the premise is wrong. An owner draw (`month` in `src/core2/modules/business.ts`, about line 1291) pays one business's retained profit to its one owner, a counted person standing for several real households. Multiplying the draw by the owner's weight would pay a business that does not scale to the weighted town profit it never earned. The draw is short per resident at scale 69 because the businesses are still the sample's: the weighted town buys from and employs through the same few firms (counted wages, purchases and the draws all draw on that one economy). So the short lines in the group-fund view (owner draws, counted wages, purchases, and possibly retirement) are one cause: businesses, jobs and their sales are not sized to the Census town, which is `world-census-weight-economy` (businesses and job counts, with the hiring part in PR 4784). Close this item when that one lands and the D.C. view at scale 69 (seed `big1`, group-fund sources over 30 days, per resident) shows these lines within 25 percent of the small town's.

PR #5306 sent back: Test failed in Susanville, California (seed 6d6c5505b807665f0ebf54c6b4032b5b838ce7a64115038b05e5336cfc77108f) with ratio 0.669 (< 0.75 threshold).

Checked Oct 20 (claude/census-owner-draws): PR #5306's test (62 days, countScale 3) with the #5373 branch merged in still fails: Tafuna, American Samoa (seed 6a4e34a3da3c4f4d447375cd85f9f6f1a31d5958e2e880331061b67ae66737e9) ratio 0.274; Caldwell, New Jersey (seed afb96112f948934fb4b14a6d870500b5807d3a427ff281c069be51f76abc2220) ratio 0.488. The businesses (and so the draws) are still the sample's count, so the cause is the establishment count (world-census-scaled-establishments-short, PR #5076), not the draw. Take this again after that lands; #5306's test is the done-when.

Sent back 2026-10-20 from PR #5306 (branch claude/pool-owner-draws): The Done when requires a drawn town above 10000 at its actual Census scale versus default size, within 25 percent per resident over 30 days. The body explicitly measured only scale 3 in St. Marys, Alaska, not Census scale in a large town. Run the required scale/place case and retain it beside the drawn-place test before completing this item.; finish on that branch, merge main into it first.
