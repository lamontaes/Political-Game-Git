---
id: laws-cannabis-dispensaries
title: "Licensed cannabis dispensaries are founded through the business engine and the cannabis spending goes to them"
area: world
kind: wiring
priority: 3
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: laws-cannabis-adult-use-record
source: added with npm run pool -- add
---

**What.** Legal cannabis spending is split across the town's existing retail businesses by demand because no dispensary is founded. Found licensed dispensaries through the business engine where the sales law is in force and demand supports them, and send the adult-use spending to them instead of the general retailers. A player would notice dispensaries appear in town after legalization and the cannabis tax line come from their receipts.

**Rules.** Wire to the world: a dispensary is a business with owners, staff and books, and its receipt goes through the sales receipt so the tax in force collects. An effect is a read: the place-prices engine reads the dispensary rows when it routes the spending. No dice: founding follows demand and the law, not a chance. One rule, all 56 places: legality and licensing come from each place's law data.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 where the sales law is enacted after the opening, seed named) a dispensary business record id is founded, its receipts carry the sales tax in force into the treasury ledger record id, and the stopgap SG-GOV-REACH-A-cannabis-market is resolved in src/core2/data/stopgaps.json; src/core2/cannabis-sales-law.test.ts covers it.

**Files.** src/core2/modules/business.ts, src/core2/modules/place-prices.ts, src/core2/data/stopgaps.json

**Notes.** Part of laws-cannabis-dispensaries-adult-use (the WORLD half). Waits on the adult-use record so the buyers are named.
