---
id: world-opening-savings-beyond-bank-accounts
title: "Households open with only what they keep in bank accounts: savings in CDs, savings bonds, stocks and funds are not counted, and age and income are read as separate effects"
area: world
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-counted-renters-buy
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: Account lead T54 2026-11-14
source: Account lead T54, building counted households' savings for world-counted-renters-buy (#9117), Nov 14, 2026
---

**What.** A household's opening cash is the Survey of Consumer Finances 2022 median transaction-account balance (checking, savings and money market) for its income, times its head's age group's median over all families'. Families also hold certificates of deposit (6.5% of families), savings bonds (6.4%), stocks (21.0%) and pooled investment funds (11.5%), which a family can draw for a down payment; the opening counts none of them. Seen: fewer renters than real can cover a down payment where homes are dear (Bloomingdale, New Jersey: 4 to 16 buyers a year at about $400,000 a home, a price lean of −9.9% at year 5).

**Cause.** Measured: the opening reads only `data/research/money/scf-transaction-accounts-2022.json` (medians by income group, and by age of head from a published reprint) through `medianTransactionBalance` in src/core2/starting-cash.ts. The survey's tables that cross age of head with income, and give each asset type's median and mean by group (the Federal Reserve's historical tables workbook, Tables 1 and 6), could not be read from the build session on Nov 14: the environment's network refuses www.federalreserve.gov and sda.berkeley.edu. The within-group spread of savings (`countedSavingsSpreadLog`, 1.39) comes from the October 2023 Bulletin's Table 3 mean and median for transaction accounts.

**Fix.** From a reachable copy of the SCF 2022 historical tables (a mirror, a package, or a publication that reprints Tables 1 and 6), add the liquid assets beyond transaction accounts (certificates of deposit, savings bonds, directly held stocks, pooled investment funds) by income group and age of head to the data file, read them in `publishedTransactionBalance` as one more term per holder share, and recompute `countedSavingsSpreadLog` from the groups' means and medians.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Real data calibrates the opening only; it never decides one household's choice. Every number in the parameter or data table with its source.

**Done when.** The data file cites the tables read, the opening cash at Bastrop, Louisiana (place 2204685, seed c3) and Bloomingdale, New Jersey (place 3406340, seed e5) rises by the share the new assets add, shown in a test, and year 1 and time per record at three drawn places are in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/starting-cash.ts, data/research/money/scf-transaction-accounts-2022.json, src/core2/data/counted/parameters.json

**Notes.**
