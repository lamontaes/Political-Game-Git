---
id: world-business-entry-below-bds
title: "Businesses open at a third of the Census rate in a played year (5 opened against about 16 in eight drawn towns); closures match"
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

**What.** In a played year in eight drawn towns (seeds b1 to b8 through `scripts/core2-year/business-entry-exit-check.ts`) 176 businesses were open at the start, 16 closed (the Census Business Dynamics state medians give about 15.7) and only 5 opened (about 16.3 expected). All 5 openings were in one town (Heeia, Hawaii); the other seven opened none, including Standing Rock, Alabama, Loch Arbour, New Jersey, Edgerton, Wyoming, Haystack, New Mexico and Allendale, Illinois. Closures match, so a town loses about 6 percent of its businesses a year net, which feeds the shrinking towns in world-local-sales-below-opening-forecast and world-hires-below-jolts. Find why founders and owners rarely open one: `foundings` in `src/core2/modules/business.ts` (the market's room, the prospect against the founder's pay, the capital a founder can reach, and the owners' expansion choice).

**Rules.** No dice: a founding comes from a person's traits, cash and what the market leaves room for; real rates check totals only. One model, two tiers: counted adults found a business with the same rule as full people. Never tune a seed.

**Done when.** The same check over eight or more drawn places (names and seeds in the PR body) opens within a third of the Census count in total, every opening cites the founder and the market room that caused it, and money still balances.

**Files.** src/core2/modules/business.ts, scripts/core2-year/business-entry-exit-check.ts

**Notes.** Found writing the check (this branch). Washington, D.C. (seed b7) closed 8 of 23, including a press outlet; the closure rate there is above the state-level rate and may be the outlets' own rule.
