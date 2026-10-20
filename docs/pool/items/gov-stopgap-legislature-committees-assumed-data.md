---
id: gov-stopgap-legislature-committees-assumed-data
title: "Stopgaps in legislature-committees (assumed-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: gov-chamber-committees-reader, gov-chamber-committees-data-a-m, gov-chamber-committees-data-n-z
size: L
source: "src/core2/data/stopgaps.json, src/core2/legislature-committees.ts, kind assumed-data"
claimed-at: 
---

**What.** Roll-up for SG-GOV-committee-names-national in src/core2/legislature-committees.ts. Every state chamber and Congress now sends bills to the same nine subject committees in committees.json, but each real chamber keeps its own list under its own names (10 to 40 committees; Congress's are in data/office-day/federal-committees.json). Split Oct 20 into gov-chamber-committees-reader (committeeForSection, the leadership seating and the bill routing take a chamber and read its own list, falling back to the national nine for a chamber with no row), gov-chamber-committees-data-a-m and gov-chamber-committees-data-n-z (the researched committee lists for every chamber). Nothing is built under this item itself.

**Rules.** One rule, all 56 places: the committee lists are data keyed by chamber and no state is named in code. Research before building: each list cites the chamber's rules or committee page. Replace, never layer: the national nine and the api.stopgap marker are removed when the last part lands. An effect is a read, not a record: committee lists must change who seats, hears and votes a bill.

**Done when.** All three parts are done: in a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a bill in the state's chamber goes to that chamber's own named committee and Congress's to a real House or Senate committee, shown by bill and committee record ids in src/core2/legislature-committees.test.ts, and SG-GOV-committee-names-national is resolved in src/core2/data/stopgaps.json.

**Files.** docs/pool/items/gov-chamber-committees-reader.md, docs/pool/items/gov-chamber-committees-data-a-m.md, docs/pool/items/gov-chamber-committees-data-n-z.md

**Notes.** First row: Every state chamber and Congress keeps the same nine subject committees (finance, judiciary, education, health, labor and commerce, transportation, environment, housing, government), not its own list and names.

Oct 20 (pool feeder): spec written and split into three parts; related and already done: gov-bills-go-to-subject-committees (the nine-committee routing).
