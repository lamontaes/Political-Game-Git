---
id: world-households-open-with-no-financial-assets-beyond-transaction-accounts
title: "Households open with their transaction accounts only: no CDs, stocks, funds or retirement savings, so almost no renter can make a down payment"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: day-one-in-motion
lead: money
model: sonnet
effort: medium
source: "found by T54 measuring renters for world-counted-renters-buy (#9117), Nov 15; plan accepted by the Account lead 11:00Z; child of opening-bank-credit-empty-at-day-0"
---

**What.** A household opens with the survey's median balance of transaction accounts (checking, savings and money market) and nothing else a family owns: no certificates of deposit, savings bonds, stocks, pooled funds or retirement accounts. First-time buyers mostly pay their down payment from savings and financial assets (NAR 2025: savings 59%, financial assets 26%). So at Bastrop, Louisiana only 5 of about 2,000 counted renter households buy from Feb 1 to Aug 1, about 0.5% a year, against 2 to 6% a year from the surveys. Seen: in dev mode, a household's money is its cash and a few hundred dollars at the bank, whatever its age and pay.

**Cause.** Found in code: the opening writes only `medianTransactionBalance` (src/core2/starting-cash.ts, from data/research/money/scf-transaction-accounts-2022.json) for every household; no module writes any other financial asset at the opening.

**Fix.** The design is accepted (plan: /mnt/project-files/account-lead/t54-opening-savings-plan.md):

- Certificates of deposit open as the household's deposits at the town's bank, funded as cash is, so `depositsHeld` and the buyers' means read them.
- Market assets (stocks, pooled funds, bonds, savings bonds, other managed and other) are a record held against the place's outside account, sold to pay.
- Retirement accounts and cash value life insurance are recorded, not drawn for a down payment.
- Each household's holding comes from the survey row for its tenure, income and age of head. The share holding checks totals; no seeded roll decides one household; amounts are the survey's medians among holders, scaled by the world's balance level.

Blocked source: those rows are in the SCF 2022 historical tables workbook, Table 6 (https://www.federalreserve.gov/econres/files/scf2022_tables_public_nominal_historical.xlsx), and in the Census SIPP wealth detail tables. Neither can be reached from a cloud session: the proxy refuses federalreserve.gov and census.gov for downloads, and the fetch tool reads the workbook as binary. Published all-family figures only (SCF 2022 Bulletin Table 3; SIPP P70BR-183) must not stand in for the rows. First step: a session that can reach the workbook reads Table 6's rows by housing status, income percentile and age of head into data/research/money/, with its citation.

**Time box.** 5 hours for one Sonnet session at medium effort, after the rows are read. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: the figures are the survey's rows, with the world's balance level as the only spread. No dice: a household's holding follows its situation and the survey's totals, never a roll. Day one is in motion: every dollar opened is funded, so the books balance.

**Done when.** A test pinned at Bastrop (2204685, `drawPlace("c3","home-price-paths")`) shows each renter household's opening deposits and asset record matching its survey row, by household id. The year's renter-to-owner rate at Bastrop, Bloomingdale and Matagorda, before and after, sits inside the survey band and is in the pull request body, with year 1 time per record. A second session sees in dev mode, at a drawn place it names with its seed, a household's savings at the bank and its other assets on day one.

**Waits on.** The SCF Table 6 rows, read by a session that can reach the Fed's site.

**Files.** src/core2/starting-cash.ts, src/core2/population.ts, src/core2/credit-deposits.ts, data/research/money/
