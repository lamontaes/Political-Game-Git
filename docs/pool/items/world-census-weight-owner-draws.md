---
id: world-census-weight-owner-draws
title: "Owner draws of counted owners stand for as many households as the town's weight says"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Washington, D.C. opened at 69 times its sample (seed `big1`), a 30-day look at what enters and leaves the counted groups' funds, by journal source (a wrapper on `api.postJournal` summing postings to the `rt.funds` accounts), shows lines that do not track the weight. Per person in the town: owner draws are $11.7 against $427 in the small town (36 times too low), counted wages $26.5 against $170 (6 times; the hiring item in PR 4784 covers wages), retirement pay $143 against $307, and purchases $71 against $95. Rent, mortgage, outside living, unplaced wages and property tax now match the small town to within about 10 percent. Find why each line is short (the owner-draw flow and its payer's books first: `owner-draw:` entries in `src/core2/modules/business.ts` or `residents.ts`) and weight it, one line at a time.

**Rules.** One model, two tiers: the same dollars per household, times the count. Every dollar balances. No dice.

**Done when.** In a drawn town above 10,000 opened at its Census scale (name place and seed), the owner-draw line per town resident is within 25 percent of the default-size town's over 30 days, and a test beside `counted-weight-money.test.ts` states it. File the other short lines (retirement, purchases) as their own items if they are not the same cause.

**Files.** src/core2/modules/business.ts, src/core2/modules/residents.ts

**Notes.** Found measuring the uncapped opening (core-census-uncap-opening) after PR 4862 (unplaced wages and the groups' bank deposits).
