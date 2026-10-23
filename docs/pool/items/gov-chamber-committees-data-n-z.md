---
id: gov-chamber-committees-data-n-z
title: "Standing committee lists for every chamber of the states and territories from Montana through Wyoming"
area: gov
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-chamber-committees-reader, gov-chamber-committees-data-a-m
blocked-on:
milestone:
source: split from gov-stopgap-legislature-committees-assumed-data by pool feeder Oct 20
---

**What.** Research each legislative chamber's own standing committees for the places whose postal codes run MS, MT, NC, ND, NE, NH, NJ, NM, NV, NY, OH, OK, OR, PA, PR, RI, SC, SD, TN, TX, UT, VA, VI, VT, WA, WI, WV and WY, and write them into src/core2/data/legislature/chamber-committees.json in the format the first data part set: for each chamber every standing committee with its display name key, the catalog topics, law series and budget-line flag, read from the chamber's rules or committee page and Book of the States Table 3.23. Then delete the national-nine marker and the api.stopgap call in legislature-committees.ts if every chamber has a row.

**Rules.** Research before building: every row cites the chamber's rules or committee page and a number from memory stays ESTIMATED. One rule, all 56 places: the file covers every chamber in its half and logic names none. Replace, never layer: when all chambers have rows the national-nine fallback is kept only for chambers with no found list and the stopgap row is resolved with that list named. Estimate, never UNKNOWN: a chamber with no found list keeps the national nine marked ESTIMATED.

**Done when.** chamber-committees.json has a row for every chamber in these places with a source and retrieval date; a one-year run of the played world (buildBenchWorld) in a drawn place from this half with a seed the builder did not choose sends its bills to the chamber's own committees, shown by bill and committee record ids in src/core2/legislature-committees.test.ts, and SG-GOV-committee-names-national is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/data/legislature/chamber-committees.json, src/core2/legislature-committees.ts, src/core2/legislature-committees.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): part 3 of 3 of gov-stopgap-legislature-committees-assumed-data.
