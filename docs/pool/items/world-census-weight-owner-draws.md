---
id: world-census-weight-owner-draws
title: "Owner draws of counted owners stand for as many households as the town's weight says"
area: world
kind: bug
priority: 1
size: S
status: blocked
claimed-by: claude/political-game-pool-7xkkii
pr: #5306
blocked-on:
after: world-census-scaled-establishments-short
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:49:10.908Z
---

**What.** In a town opened at its Census size, the owner-draw line into the counted groups' funds per resident is far below the small town's: the draw (the month pass in src/core2/modules/business.ts) pays one business's retained profit to its one owner, and the businesses are still the sample's count. The cause is the establishment count, which world-census-scaled-establishments-short fixes, not the draw, and multiplying the draw by the owner's weight would pay out profit a business never earned. Once that lands, measure the 30-day owner-draw line per resident in a town above 10,000 against the default-size town's, add the test that states the 25 percent bound beside counted-weight-money.test.ts, and fix whatever shortfall the scaled businesses leave in business.ts or residents.ts, one line at a time. File the retirement and purchases lines as their own items if they are a different cause.

**Rules.** One model, two tiers: a counted owner stands for the same dollars per household as a full owner, so the draw per household matches and only the count of businesses grows with the town. No dice: the draw follows each business's books and its owner's needs, never a share rolled. Wire to the world: the draw is read by the owner's household as income, so the proof follows it to the group fund by journal source. Every dollar balances: the cash journal balances after the change, checked in the same run.

**Done when.** A test beside src/core2/counted-weight-money.test.ts opens a drawn town above 10,000 at its Census scale with buildBenchWorld, in a played-world run of 62 days on a seed the builder did not choose, and shows the owner-draw journal source per resident within 25 percent of the default-size town's, naming the place, the seed and the draw postings by record id. It passes in at least three drawn places including a territory.

**Files.** src/core2/modules/business.ts, src/core2/modules/residents.ts, src/core2/counted-weight-money.test.ts

**Notes.** Found measuring the uncapped opening (core-census-uncap-opening) after PR 4862 (unplaced wages and the groups' bank deposits).

Looked at Oct 17 (claude/owner-draws-weighted-s5), not built, and the premise is wrong. An owner draw (`month` in `src/core2/modules/business.ts`, about line 1291) pays one business's retained profit to its one owner, a counted person standing for several real households. Multiplying the draw by the owner's weight would pay a business that does not scale to the weighted town profit it never earned. The draw is short per resident at scale 69 because the businesses are still the sample's: the weighted town buys from and employs through the same few firms (counted wages, purchases and the draws all draw on that one economy). So the short lines in the group-fund view (owner draws, counted wages, purchases, and possibly retirement) are one cause: businesses, jobs and their sales are not sized to the Census town, which is `world-census-weight-economy` (businesses and job counts, with the hiring part in PR 4784). Close this item when that one lands and the D.C. view at scale 69 (seed `big1`, group-fund sources over 30 days, per resident) shows these lines within 25 percent of the small town's.

PR #5306 sent back: Test failed in Susanville, California (seed 6d6c5505b807665f0ebf54c6b4032b5b838ce7a64115038b05e5336cfc77108f) with ratio 0.669 (< 0.75 threshold).

Checked Oct 20 (claude/census-owner-draws): PR #5306's test (62 days, countScale 3) with the #5373 branch merged in still fails: Tafuna, American Samoa (seed 6a4e34a3da3c4f4d447375cd85f9f6f1a31d5958e2e880331061b67ae66737e9) ratio 0.274; Caldwell, New Jersey (seed afb96112f948934fb4b14a6d870500b5807d3a427ff281c069be51f76abc2220) ratio 0.488. The businesses (and so the draws) are still the sample's count, so the cause is the establishment count (world-census-scaled-establishments-short, PR #5076), not the draw. Take this again after that lands; #5306's test is the done-when.

Oct 20 (pool feeder): spec written; waits only on world-census-scaled-establishments-short (in-pr), which the earlier notes already named as the cause, so the item is the measurement test plus any residual fix.
