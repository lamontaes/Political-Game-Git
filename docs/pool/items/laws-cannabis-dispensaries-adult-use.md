---
id: laws-cannabis-dispensaries-adult-use
title: "Legal cannabis sales run through licensed dispensaries and a named adult-use record, not a per-resident average"
area: laws
kind: wiring
priority: 3
size: L
status: blocked
claimed-by: claude/political-game-pool-b6g0dl
pr:
blocked-on: laws-cannabis-dispensaries
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:27:38.803Z
---

**What.** Legal cannabis sales run through licensed dispensaries and a named adult-use record, not a per-resident average. This item was split by its claimer into two bounded parts: the adult-use record on named adults (laws-cannabis-adult-use-record) and the dispensaries founded through the business engine (laws-cannabis-dispensaries). The excise tax half already ships through the sales receipt (laws-cannabis-sales-tax).

**Rules.** An effect is a read: each part names the engine that reads what the other writes. One model, two tiers; one rule, all 56 places. The standing rule Wire to the world applies to each part.

**Done when.** Both parts are done and SG-GOV-REACH-A-cannabis-market is resolved in src/core2/data/stopgaps.json, shown by src/core2/cannabis-sales-law.test.ts in a drawn place of the played world with the dispensary and use record ids named.

**Files.** src/core2/modules/place-prices.ts, src/core2/modules/business.ts, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 by claude/political-game-pool-b6g0dl.
