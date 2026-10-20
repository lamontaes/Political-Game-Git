---
id: elections-stopgap-electorate-inputs-missing-data
title: "Stopgaps in electorate-inputs (missing-data): 1 open"
area: elections
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: gov-president-approval-record, elections-electorate-reads-approval
size: L
source: "src/core2/data/stopgaps.json, src/core2/electorate-inputs.ts, kind missing-data"
claimed-at: 
---

**What.** Roll-up for SG-GOV-electorate-approval in src/core2/electorate-inputs.ts. raceConditions sets the national mood that moves every voter's choice for the president's party from nationalEconomyChange (unemployment and inflation since the opening) and the midterm penalty, because no record of presidential approval exists. Split Oct 20 into gov-president-approval-record (a monthly approval row built from the president's own record, what the public has heard and how it feels the economy) and elections-electorate-reads-approval (raceConditions reads that row and the measured effect on the vote replaces the bare economy term). Nothing is built under this item itself.

**Rules.** An effect is a read, not a record: the approval row counts only because the race engine reads it on election day. Replace, never layer: the economy-only mood is replaced, not kept beside the approval. No dice: approval follows people's views and the record, never a roll. One model, two tiers: counted groups feel and approve by the same rule as full people, times their count.

**Done when.** Both parts are done: in a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a race's national condition cites a president approval record id and the stopgap SG-GOV-electorate-approval is resolved in src/core2/data/stopgaps.json, proven in src/core2/electorate-inputs.test.ts.

**Files.** docs/pool/items/gov-president-approval-record.md, docs/pool/items/elections-electorate-reads-approval.md

**Notes.** First row: The national mood that moves every voter's choice for the president's party is read from the national economy since the opening (unemployment and inflation) and the midterm penalty, with no presidential approval behind i

Oct 20 (pool feeder): spec written and split into two parts.
