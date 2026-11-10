---
id: research-executive-powers-verified
title: "Research: verify each row of the executive powers file against its source"
area: office
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: researcher
model: sonnet
effort: medium
root: none
source: stand-in triage T1, Nov 10, 2026 (docs/stopgaps/triage-2026-11-10/gov-a.md)
---

**What.** What a governor, mayor or county executive may order, and which cabinet and department posts a place has, come from a file nobody checked against a source.

**Cause.** Found in code: src/core2/modules/executive.ts lines 1282 to 1283 (stopgap SG-GOV-executive-powers-research, open in src/core2/data/stopgaps/gov.json): which orders may be issued, the state cabinets and the local department heads are read at executive.ts line 27 from data/research/executive/executive-powers-2026.json, a file written from memory in which every row is an estimate.

**Fix.** For each of the 56 places, check the file's row (canOrder, the cabinet posts and who appoints them, the local department heads) against the state constitution, statute or charter it cites. Fix wrong rows, change each checked row's tag to SOURCED with a quote and a URL, and leave the rest ESTIMATED with the reason. Run the executive tests. Narrow the stopgap row to the rows still estimated. Offering further orders is each order's own engine item, not this one.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the result must move money, people or places in a generated world, in all 56 places. One rule, all 56 places: nothing names a state, county or city in code; place facts live in data. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. Speed: the work runs monthly or on the day something changes and keeps a played year under two minutes (npm run speed:year).

**Done when.** A second session picks three places from all 56 as drawn places (names and seed written down), reads each one's executive row beside the cited source and finds the quote and URL matching, and a played year in one of them in dev mode offers the orders the row allows. The file has no row tagged ESTIMATED without a reason and the stopgap row names the rows still estimated.

**Waits on.** Nothing.

**Files.** data/research/executive/executive-powers-2026.json, src/core2/modules/executive.ts, src/core2/data/stopgaps/gov.json

**Notes.** Written by the stand-in triage (T1). The lead adds the checked line after reading.
