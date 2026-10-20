---
id: gov-chamber-committees-data-a-m
title: "Standing committee lists for every chamber of the states and territories from Alabama through Missouri and the Marianas"
area: gov
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-chamber-committees-reader
blocked-on: 
milestone:
source: split from gov-stopgap-legislature-committees-assumed-data by pool feeder Oct 20
---

**What.** Research each legislative chamber's own standing committees for the places whose postal codes run AL, AK, AS, AR, AZ, CA, CO, CT, DC, DE, FL, GA, GU, HI, IA, ID, IL, IN, KS, KY, LA, MA, MD, ME, MI, MN, MO and MP, and write them into src/core2/data/legislature/chamber-committees.json: for each chamber (lower, upper or unicameral) every standing committee with its display name key, the catalog topics, law series and whether it hears budget lines, read from the chamber's rules or committee page and Book of the States Table 3.23. Cite the page and retrieval date on every row and mark it SOURCED, or ESTIMATED with the spread where a chamber does not publish a list.

**Rules.** Research before building: every row cites the chamber's rules or committee page and a number from memory stays ESTIMATED. One rule, all 56 places: the file covers every chamber in its half and logic names none. Estimate, never UNKNOWN: a chamber with no found list keeps the national nine marked ESTIMATED. An effect is a read, not a record: the rows are read by the committee router and the leadership seating. American English everywhere in committee name keys.

**Done when.** chamber-committees.json has a row for every chamber in these places with a source and retrieval date; a test in src/core2/legislature-committees.test.ts checks every catalog topic is heard by some committee in each chamber, and a one-year run of the played world (buildBenchWorld) in a drawn place from this half with a seed the builder did not choose sends its bills to the chamber's own committees, shown by bill and committee record ids.

**Files.** src/core2/data/legislature/chamber-committees.json, src/core2/legislature-committees.test.ts

**Notes.** Oct 20 (pool feeder): part 2 of 3 of gov-stopgap-legislature-committees-assumed-data. Nebraska is unicameral (one row), so the half covers about 47 chambers. Congress is built from federal-committees.json in the reader part.
