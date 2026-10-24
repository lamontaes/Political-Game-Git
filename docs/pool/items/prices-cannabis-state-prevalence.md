---
id: prices-cannabis-state-prevalence
title: "A named adult's cannabis use reads their own state's adult share, not the national one"
area: world
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** usesCannabis and cannabisWeight in src/core2/modules/place-prices.ts read one national share of adults who used cannabis in the past year (pricesCannabisUsePrevalence, 23.17 percent) for every place. The share varies from 15.94 percent in one state to 37.57 percent in another, and the table for all 56 places is now sourced in data/research/laws/samhsa-2024-cannabis-past-year.json (NSDUH 2023-2024, adults 18 and over; territories at the median, marked estimate). The engine should read the town's state row from that table for named adults and for counted groups alike, keeping the national row only as the fallback, which closes the PEOPLE half of SG-GOV-REACH-A-cannabis-market.

**Rules.** One rule, all 56 places: the share comes from the per-place table keyed by postal code, never a state named in logic. One model, two tiers: a counted group reads the same state share times its count as a named adult does. No dice: the share calibrates who uses cannabis at generation, never a purchase.

**Done when.** In a drawn place from all 56 in the played world (buildBenchWorld, seed named in the PR), the share of named adults 21 and over recorded as users and the counted groups' weight both read the town's state row of data/research/laws/samhsa-2024-cannabis-past-year.json, shown by src/core2/cannabis-sales-law.test.ts with the place, its row and a named adult's person id.

**Files.** src/core2/modules/place-prices.ts, src/core2/data/prices/parameters.json, data/research/laws/samhsa-2024-cannabis-past-year.json

**Notes.** TODO
