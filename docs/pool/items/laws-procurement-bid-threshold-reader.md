---
id: laws-procurement-bid-threshold-reader
title: "Procurement: a competitive-bid threshold a town's purchases read, with the 56-place table"
area: laws
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The bill menu's Procurement topic is empty because no state's competitive-bidding threshold is in the starting law and no engine reads one. The finance engine's procure step (prepareFinanceProcurement) moves a public body's purchasing money but chooses a seller with no bid rule, and the budget engine buys no contracts that a threshold could gate. The topic needs a researched table of the dollar value above which a town or county must bid a purchase, by state, and a reader that makes a purchase over the threshold go through a bid with a delay and a record.

**Rules.** Estimate, never unknown: a place with no statutory number takes the median of those with one, marked ESTIMATED FROM AVERAGE. No dice: the delay and the winning seller come from the bidders' records and the law in force. One rule, all 56 places: the table is read from data, never from a named state.

**Done when.** A 56-place bid-threshold table is loaded as a law series with its sources; a purchase by a drawn town's government above its threshold is held for a bid in a played year with the bid record, its posting date and the law id named by record id, and one below it is bought directly; the series is a bill a council or legislature can pass.

**Files.** data/research/laws/procurement-thresholds-2026.json,scripts/research/build-starting-law.py,src/core2/modules/finance.ts,src/core2/modules/budgets.ts

**Notes.** Nov 9 (Laws and effects): found while taking the next empty bill topic after public records and meetings (#8026). Both the table and the reader are new work; the finance engine's procure step is the place a bid would sit. Needs the owner of the finance and budget engines to say where a bid belongs before the reader is written.
