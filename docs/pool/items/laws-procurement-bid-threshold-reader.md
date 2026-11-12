---
id: laws-procurement-bid-threshold-reader
title: "Procurement: a competitive-bid threshold a town's purchases read, with the 56-place table"
area: laws
kind: wiring
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: opus
effort: medium
root: design-bill-catalog
checked: fable 2026-11-10
---

**What.** The bill menu's Procurement topic is empty because no state's competitive-bidding threshold is in the starting law and no engine reads one. The finance engine's procure step (prepareFinanceProcurement) moves a public body's purchasing money but chooses a seller with no bid rule, and the budget engine buys no contracts that a threshold could gate. The topic needs a researched table of the dollar value above which a town or county must bid a purchase, by state, and a reader that makes a purchase over the threshold go through a bid with a delay and a record.

**Cause.** Design: bill menu rulings docs/design/legislative-content-menus-v1.md (Procurement topic); no engine reads a bid threshold today (grep of modules/finance.ts finds none).

**Fix.** Research a 56-place threshold table as a law series, load it, and make a purchase over the threshold in the finance engine go through a bid with delay and record.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never unknown: a place with no statutory number takes the median of those with one, marked ESTIMATED FROM AVERAGE. No dice: the delay and the winning seller come from the bidders' records and the law in force. One rule, all 56 places: the table is read from data, never from a named state.

**Done when.** A second session, not the builder, checks in a played year in a drawn place (place and seed named): a 56-place bid-threshold table is loaded as a law series with its sources; a purchase by the town's government above its threshold is held for a bid, with the bid record, its posting date and the law id named by record id, and one below it is bought directly; and the series appears as a bill a council or legislature can pass.

**Waits on.** Nothing. The Notes ask the finance and budget engines' owner where a bid belongs; ask that session (docs/coordination/CREW.md) before writing the reader.

**Files.** data/research/laws/procurement-thresholds-2026.json (new), scripts/research/build-starting-law.py, src/core2/modules/finance.ts, src/core2/modules/budgets.ts

**Notes.** Nov 9 (Laws and effects): found while taking the next empty bill topic after public records and meetings (#8026). Both the table and the reader are new work; the finance engine's procure step is the place a bid would sit. Needs the owner of the finance and budget engines to say where a bid belongs before the reader is written. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it would add a researched bid threshold for every state and a bid step with a delay to every purchase; the only thing seen today is an empty bill-menu topic, which can be hidden.
