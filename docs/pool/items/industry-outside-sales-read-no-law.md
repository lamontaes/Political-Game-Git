---
id: industry-outside-sales-read-no-law
title: "Sales to buyers beyond the town follow the economy but no law: a tariff or freight change never reaches them"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-1-wholesale-sells-beyond-its-town
blocked-on:
root: none
lead: laws
model: opus
effort: medium
source: "Industries thread, Nov 16 (from #9627, the wholesaler's outside buyers); builder of record: the effects (law-links) thread, its item 5 (tariffs on imported input costs) and item 6 (freight)"
---

**What.** A business that sells beyond its town (a wholesaler, a factory, a power plant, a farm once farms are built) gets that money from its `outside-sales` flow. After the opening, the flow moves only by its sector's national factor, the seller's staffing, its rivals' share and its output limit. No law in force is read there, so a tariff, a freight rule or a trade measure a body passes never raises or lowers what outside buyers pay a town's seller, and the bill card can never show it reaching that seller's sales, staff or closing. Seen: Thief River Falls, Minnesota (2764570), seed ind-2764570, a played year on #9627's head: the wholesaler's outside sales follow the trade sector's factor month by month and nothing else.

**Cause.** Found in code: `scaleOutsideSales` in `src/core2/residents-economy.ts` (line 501) sets each `outside-sales` flow from its opening amount times `factorOf(sellerId)`, the service level and the rival share; it takes no reader of the law in force. `addOutsideMarket` in `src/core2/opening-outside-market.ts` sets the opening amount from `outside-market.json` and reads no law either.

**Fix.** Give `scaleOutsideSales` the law reader the effects thread builds for a firm's result (its item 5, tariffs on imported input costs, which answers the open item `gov-federal-questions-rule-readers-part-1-business-privacy-carbon-tariffs`; related, not a twin), so a tariff or freight rule in force moves the price outside buyers pay by the goods the seller sells, and the flow's amount with it. The player sees it on dev mode's Industries page (the Outside buyers a year column and the business's months) and on the bill card's reach, against the same world with a do-nothing bill.

**Time box.** 4 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** An effect is a read, not a record: the law changes the seller's sales only when the outside-sales flow reads it at the moment it pays. One rule, all 56 places: no place, state or kind named in logic.

**Done when.** In a drawn place with a seller that has outside buyers, a tariff or freight law triggered from dev mode moves that seller's outside sales against the do-nothing twin, named by flow and law record id, shown on the Industries page; a second session sees it in the running game.

**Waits on.** The effects thread's tariff reader (its item 5); freight is that thread's item 6, filed when it reaches it.

**Files.** src/core2/residents-economy.ts, src/core2/opening-outside-market.ts, src/core2/data/outside-market.json

**Notes.** Nov 16: filed by the industries thread at the effects thread's request, with the effects thread as builder of record.
