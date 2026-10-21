---
id: world-property-tax-due-dates-data
title: "Each place's property-tax due dates and installments are in a sourced data table"
area: world
kind: research
priority: 2
size: M
status: done
claimed-by: claude/property-tax-data-g08lgv
pr: #5230
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:50:39.929Z
---

**What.** Owners now pay property tax a twelfth a month, as through a mortgage escrow, because no data says when each place bills. Collect, for each of the 56 places, how many installments the county or town bills a year, their due dates and any delinquency date, from the place's tax collector or statute, and write them to a sourced table. Where a place differs by county, record the state's rule and say so. This is the data the billing change reads, so the build item can follow.

**Rules.** Research before building: every row cites its statute or collector page and is SOURCED, or ESTIMATED with the spread when a state leaves dates to each county. One rule, all 56 places: dates live in the data table, never in code, and no place is named in logic. Estimate, never UNKNOWN: a place with no found date starts from the national pattern with its source marked as an estimate.

**Done when.** `src/core2/data/housing/property-tax.json` (or a new file beside it) holds installment count and due dates for all 56 places, each with a source and a tag, and a test in `src/core2/housing-property-tax.test.ts` draws a place from all 56, names it with the seed, and shows its row reads back with a source. The owner plays it: nothing at once; the billing item reads this table.

**Files.** src/core2/data/housing/property-tax.json, src/core2/housing-property-tax.test.ts, docs/research/

**Notes.** The mortgage escrow stays monthly for owners with a mortgage; only owners without one bill on the due dates (see SG-WORLD-property-tax-monthly in src/core2/data/stopgaps.json).
