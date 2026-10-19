---
id: world-census-weight-owner-draws
title: "Owner draws of counted owners stand for as many households as the town's weight says"
area: world
kind: bug
priority: 1
size: S
status: blocked
claimed-by:
pr:
blocked-on: world-census-weight-economy
source: added with npm run pool -- add
claimed-at:
---

**What.** In Washington, D.C. opened at 69 times its sample (seed `big1`), a 30-day look at what enters and leaves the counted groups' funds, by journal source (a wrapper on `api.postJournal` summing postings to the `rt.funds` accounts), shows lines that do not track the weight. Per person in the town: owner draws are $11.7 against $427 in the small town (36 times too low), counted wages $26.5 against $170 (6 times; the hiring item in PR 4784 covers wages), retirement pay $143 against $307, and purchases $71 against $95. Rent, mortgage, outside living, unplaced wages and property tax now match the small town to within about 10 percent. Find why each line is short (the owner-draw flow and its payer's books first: `owner-draw:` entries in `src/core2/modules/business.ts` or `residents.ts`) and weight it, one line at a time.

**Rules.** One model, two tiers: the same dollars per household, times the count. Every dollar balances. No dice.

**Done when.** In a drawn town above 10,000 opened at its Census scale (name place and seed), the owner-draw line per town resident is within 25 percent of the default-size town's over 30 days, and a test beside `counted-weight-money.test.ts` states it. File the other short lines (retirement, purchases) as their own items if they are not the same cause.

**Files.** src/core2/modules/business.ts, src/core2/modules/residents.ts

**Notes.** Found measuring the uncapped opening (core-census-uncap-opening) after PR 4862 (unplaced wages and the groups' bank deposits).

Looked at Oct 17 (claude/owner-draws-weighted-s5), not built, and the premise is wrong. An owner draw (`month` in `src/core2/modules/business.ts`, about line 1291) pays one business's retained profit to its one owner, a counted person standing for several real households. Multiplying the draw by the owner's weight would pay a business that does not scale to the weighted town profit it never earned. The draw is short per resident at scale 69 because the businesses are still the sample's: the weighted town buys from and employs through the same few firms (counted wages, purchases and the draws all draw on that one economy). So the short lines in the group-fund view (owner draws, counted wages, purchases, and possibly retirement) are one cause: businesses, jobs and their sales are not sized to the Census town, which is `world-census-weight-economy` (businesses and job counts, with the hiring part in PR 4784). Close this item when that one lands and the D.C. view at scale 69 (seed `big1`, group-fund sources over 30 days, per resident) shows these lines within 25 percent of the small town's.

Measured Oct 19 (claude, with the default Census scale of PR #5295): Washington, District of Columbia, seed scale-probe-1, `buildBenchWorld` two-level, 60 days from 2025-01-20. At `countScale` 1 the owners' draws (`business/draws`, sum of `drawnMinor`) are $8,497,144 in 58 rows, about $850 a resident of the 10,000 sample. At the default scale (about 69, a town of 693,645) they are $520,680 in 49 rows, about $0.75 a resident: fewer dollars in total for 69 times the people. So the draws do not follow the weight at all and fall to about a thousandth per resident, worse than the 36 times short recorded on Oct 17. The businesses are the sample's and their customers are now the weighted town, so profit is spread over the same firms while the draws stay with the sample's owners; whichever way the cause is read, a big town opened at Census scale pays its owners almost nothing. This is the blocker for merging #5295 (the uncap).
