---
id: gov-stopgap-executive-missing-data
title: "Stopgaps in executive (missing-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
after:
size: M
source: "src/core2/data/stopgaps.json, src/core2/modules/executive.ts, kind missing-data"
claimed-at: 
---

**What.** Replace SG-GOV-executive-powers-research by checking data/research/executive/executive-powers-2026.json against its sources. The file was written from memory: 57 rows (50 states, D.C., the territories and federal) of cabinet positions and who confirms them, elected-instead offices, pardon authority, canOrder and executiveOrders entries, and patronage job counts, plus a local block of city and county posts; only pardon authority (52 jurisdictions), the voting-restoration orders and 16 states' confirmation rules are checked, and 13 of 19 sources say 'not retrieved'. Fetch Book of the States Table 4.10, NCSL's pages and the state constitutions, correct each row, give every row a source id with a retrieved date and a SOURCED or ESTIMATED tag with spread, and change the file's status line.

**Rules.** Research before building: every row cites a retrieved source and a number from memory stays ESTIMATED with its spread. One rule, all 56 places: the file holds all 56 and executive.ts names no state. Estimate, never UNKNOWN: a post a source does not settle keeps the common pattern marked ESTIMATED. An effect is a read, not a record: the corrected rows are read by appoint, seatCabinetPerson, orderableBy and the pardon reader in src/core2/modules/executive.ts, so a verified row must change what a governor can do. Replace, never layer: the 'not retrieved' source entries and the memory-written estimated notes are removed as rows are checked.

**Done when.** Every place row in executive-powers-2026.json carries a source id with a retrieved date and a tag, checked by a new src/core2/executive-research.test.ts, and a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose shows a governor's cabinet appointment and confirmation following that place's checked row, named by the appointment record id; SG-GOV-executive-powers-research is resolved in src/core2/data/stopgaps.json and the research-data reader guard passes.

**Files.** data/research/executive/executive-powers-2026.json, src/core2/modules/executive.ts, src/core2/executive-research.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Which orders an executive may issue, the state cabinets and the local department heads come from a research file written from memory (data/research/executive/executive-powers-2026.json, every row an estimate); only the v

Oct 20 (pool feeder): spec written; this is a pure checking task, so it was never blocked on an engine. 'More orders offered as their engines exist' in the stopgap's replacement is separate: ORDERABLE in executive.ts grows with each engine, and office-presidential-orders-pardons-the-situation-room covers the president's.
