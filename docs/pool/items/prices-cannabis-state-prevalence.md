---
id: prices-cannabis-state-prevalence
title: "A named adult's cannabis use reads their own state's adult share, not the national one"
area: world
kind: feature
priority: 2
size: S
status: dropped
claimed-by:
pr:
after:
blocked-on:
standard: 2
lead: laws
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** `usesCannabis` and `cannabisWeight` read one national share of adults who used cannabis in the past year (`pricesCannabisUsePrevalence`, 23.17 percent) for every place. The share varies from 15.94 percent in one state to 37.57 percent in another, and the table for all 56 places is sourced in data/research/laws/samhsa-2024-cannabis-past-year.json (NSDUH 2023 to 2024, adults 18 and over; territories at the median, marked estimate). The engine should read the town's state row from that table for named adults and for counted groups alike, keeping the national row only as the fallback, which closes the people half of SG-GOV-REACH-A-cannabis-market.

**Cause.** Found in code: `usesCannabis` (line 186) and `cannabisWeight` (line 201) in src/core2/modules/place-prices.ts read `pricesCannabisUsePrevalence` for every place; the stopgap SG-GOV-REACH-A-cannabis-market (src/core2/data/stopgaps/gov.json, line 378) is open; the sourced table data/research/laws/samhsa-2024-cannabis-past-year.json exists.

**Fix.** Read the town's state row from the sourced table for named adults and counted groups alike, keeping the national row only as the fallback, and resolve the people half of the stopgap.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the share comes from the per-place table keyed by postal code, never a state named in logic. One model, two tiers: a counted group reads the same state share times its count as a named adult does. No dice: the share calibrates who uses cannabis at generation and never a purchase.

**Done when.** A second session (not the builder) plays the played world (`buildBenchWorld`, a drawn place from all 56, seed named) and finds that the share of named adults 21 and over recorded as users and the counted groups' weight both read the town's state row of the table, shown by src/core2/cannabis-sales-law.test.ts with the place, its row and a named adult's person id. The session reports the town's row beside the national 23.17 percent it replaced.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, src/core2/data/prices/parameters.json, data/research/laws/samhsa-2024-cannabis-past-year.json, src/core2/cannabis-sales-law.test.ts

**On screen.** Nothing yet: it would show on Politics, then Issues and Government, and nothing there reads it.

**Notes.** TODO

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have swapped the one national 23 percent cannabis-use share for each state's own; nobody sees the difference, and the national average stays a labeled estimate.
