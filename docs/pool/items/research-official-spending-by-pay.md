---
id: research-official-spending-by-pay
title: "Check the spending-by-pay curve an official's living cost follows against the published Survey tables"
area: world
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on the owner-cash fix: the three figures were set from recalled Survey quintile tables, Nov 14"
claimed-at:
after:
lead: account-lead
model: sonnet
effort: low
root: rc9-place-facts-one-default
checked: sonnet 2026-11-14
---

**What.** A seated official's living cost follows their pay on a power curve: spending at the middle fifth's income (66,000 dollars, 65,000 spent) times the pay ratio to the power 0.58. The four numbers were set from the Consumer Expenditure Survey's middle and top income fifths as recalled, because the container cannot reach the publisher. Replace them (the ceiling share too, from tax-share and saving-rate tables) with the published 2023 or 2024 table values, read from the table itself, and set each row's spread from neighboring quintile pairs. Seen: the four rows `householdSpendingReferencePayUsd`, `householdSpendingAtReferencePayUsd`, `householdSpendingPayElasticity` and `householdSpendingMostOfPayShare` in `src/core2/data/parameters.json` quote the table and its column.

**Cause.** Found in code: `officialHousehold` in `src/core2/official-living.ts` reads those three rows; their citations say the figures are recalled and unchecked. The rows are the only place the numbers live.

**Fix.** Design: fetch the Survey's table of average annual expenditures and income before taxes by quintile of income, compute the log slope between the third and fifth quintiles and between the second and fourth, set the elasticity, reference pay and reference spending from them, tag SOURCED or ESTIMATED with the real spread, and rerun year 1 at three places to confirm the median owner's cash path stays inside the bound in the owner-cash item.

**Time box.** 2 hours for one Sonnet session at low effort. When it runs out, write what was read in the item and stop.

**Rules.** Research before building: the Survey calibrates the curve and never decides one official's spending; estimate, never unknown: a figure that cannot be fetched stays marked ESTIMATED with its spread.

**Done when.** A second session, not the builder, opens the three rows on main and sees a quoted table cell for each, then runs the year-1 median owner cash probe at drawn places and seeds it names (buildBenchWorld) and sees the median path inside the stated bound with record ids.

**Waits on.** The owner-cash fix folding.

**Files.** src/core2/data/parameters.json; src/core2/official-living.ts

**Notes.** Found while fixing world-median-owner-cash-grows-tenfold-in-a-year.
