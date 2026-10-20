---
id: laws-cannabis-dispensaries
title: "Licensed cannabis dispensaries are founded through the business engine and the cannabis spending goes to them"
area: world
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: laws-cannabis-adult-use-record
source: added with npm run pool -- add
claimed-at: 
---

**What.** Legal cannabis spending is split across the town's existing retail businesses by licensedSellers in src/core2/modules/place-prices.ts because no dispensary is founded. Add a cannabis-dispensary business kind (a classification of enterprise:retail:cannabis with its margin, staffing and startup cost in the business-books data) that the business engine founds where the sales law is in force and the adult-use demand (pricesCannabisSpendPerResidentMinor now, the adult-use record once it lands) supports one, and make licensedSellers return only dispensaries for the cannabis rule. marketRoom in src/core2/modules/business.ts builds a market only from incumbents, so a kind with no incumbent never gets a market: add the demand-without-incumbent entry for a licensed kind, then the first dispensary opens through the existing found() path with an owner, staff and books, and its receipts go through the sales receipt so the tax in force collects.

**Rules.** Wire to the world: a dispensary is a business with a named owner, staff and books, and its receipt goes through the sales receipt to the treasury. An effect is a read: place-prices reads the dispensary rows when it routes the spending, and the law is read through lawInForce each month. No dice: founding follows the demand, the owner's savings and the law, never a chance. One rule, all 56 places: legality and licensing come from each place's law data, with no place named. One model, two tiers: counted households' spending reaches the same dispensaries by the same split. Replace, never layer: until a dispensary exists the spending leaves the town as it did before the law, and the retail-wide split is deleted.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 where the sales law is enacted after the opening, with a seed the builder did not choose (name both), a dispensary business record id is founded, its receipts carry the sales tax in force into a treasury ledger record id, and SG-GOV-REACH-A-cannabis-market is resolved in src/core2/data/stopgaps.json; src/core2/cannabis-sales-law.test.ts covers it.

**Files.** src/core2/modules/business.ts, src/core2/modules/place-prices.ts, src/core2/data/business-books.json, src/core2/data/stopgaps.json, src/core2/cannabis-sales-law.test.ts

**Notes.** Part of laws-cannabis-dispensaries-adult-use (the WORLD half). Waits on the adult-use record so the buyers are named.

Oct 20 (pool feeder): spec rewritten from the existing text with the real functions. Finding: the business engine only sees a market where an incumbent of the kind already exists (marketRoom), so the work includes letting a licensed kind with demand and no incumbent open its first location. Waits on laws-cannabis-adult-use-record (in a PR) so the buyers are named.
