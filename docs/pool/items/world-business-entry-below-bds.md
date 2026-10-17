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

**Root cause found (Oct 17, claude/business-entry-below-bds, nothing built).** The founding step (`foundings` in src/core2/modules/business.ts) weighs a market by its `room` from `marketRoom`: `max(0, demand / capacity - 1)`, the demand above the incumbents' capacity. Each firm's capacity is sized above its demand at the opening, so room is 0.00 in every market in every month: in Standing Rock, Alabama (seed b1) the monthly log for the year shows 11 to 12 markets, all at room 0.00 (one at 0.01 in December), so nobody weighs founding a business there. A market with no incumbent (the only firm of a kind closed) is not in the list at all, and `shiftToOpenSellers` in residents.ts ends the closed firm's counted customers' demand when no other seller of the kind remains, so the unmet demand a real entrepreneur would see vanishes with the firm. Founding therefore needs an unmet-demand cause that survives a closure (the households' spending on that kind, kept as outside spending in the place until a seller returns) and a market row for a kind with no incumbent. That is a design for the business and residents engines together, not a calibration: left open. The five openings in Heeia, Hawaii (seed b6) came through the owners' expansion choice.
