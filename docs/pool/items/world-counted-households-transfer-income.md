---
id: world-counted-households-transfer-income
title: "Counted households with no earner have no income: transfers the full tier would receive are not in their income"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A counted household's income (householdIncome in src/core2/modules/residents.ts) is its recorded wages, its retirement awards and its share of the place's unplaced workers. Nothing else is paid to it: no Social Security for a disabled or surviving member, no cash assistance under the law in force. Once unplaced workers are whole people (branch claude/pr-renter-income), about 40 percent of renter households in a Puerto Rico town have no income at all and are evicted (65 homeless where HUD implies about 1). Pay counted households the transfers the same rules give a full household, read by householdIncome, rent and the eviction path.

**Rules.** One model, two tiers: a counted household receives a transfer by the same rule as a full household, times its count. Wire to the world: each transfer is a journal record from the paying government or outside flow. Estimate, never UNKNOWN: amounts start from sourced per-place figures with a spread.

**Done when.** In Puerto Rico place 7237336 (seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8) and a drawn place (seed named), with the branch's whole unplaced workers merged, the share of counted renter households with no income on day one is within 5 points of the ACS share with no income, and housing-calibration.test.ts passes, shown by transfer record ids.

**Files.** src/core2/modules/residents.ts, src/core2/residents.ts

**Notes.** Found working world-counted-renter-income-puerto-rico-third (see its Oct 21 notes for the ACS figures fetched: B19055, B19065, B19067 for Puerto Rico).
