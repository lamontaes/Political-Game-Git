---
id: world-press-outlet-owners-no-household
title: "A press outlet's owner has no cash, no living cost and no income: owners draw nothing because their living cost is zero"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Built Oct 18 (claude/press-owner-household, stacked on the aide living-cost change, branch claude/aides-living-cost-s5). The owner ruling has outlets owned by wealthy owners, so an owner is now given the living cost and the bank balance of a household at the top 5 percent income (`ownerHouseholdIncomeMinor`, ESTIMATED with a spread, Census Table H-1), paid in from outside, and spends the cost out of their cash each week. Their need then reads into the outlet's draw: in Meriden, Iowa (seed po1) an owner's cash rose over 84 days by a draw from the paper. The owner's income is still only the outlet's draws; whether a local owner also has other work is not modeled.
