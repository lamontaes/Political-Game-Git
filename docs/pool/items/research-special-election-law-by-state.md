---
id: research-special-election-law-by-state
title: "Research: each place's rule for the date of a special election"
area: elections
kind: research
priority: 3
size: S
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

**What.** The date of a special election after a vacancy is 90 days for every place except California. Read each place's own rule for each office family from its code.

**Cause.** Found in code: src/core2/modules/elections.ts lines 691 to 692 (stopgap SG-GOV-special-election-timing, open in src/core2/data/stopgaps/gov.json): a special election is set 90 days after the vacancy where src/core2/data/elections/special-election-law.json has no row; the file holds only California's U.S. House and legislative rows; src/core2/elections-calendar.ts line 735 reports the basis.

**Fix.** For each of the 56 places and each office family the game holds (U.S. House, state legislature, governor, county and municipal seats), find the statute or code section that sets the special election's date or window, quote it, and add a row to src/core2/data/elections/special-election-law.json with the section, the days (or window) and the tag SOURCED, or ESTIMATED with the reason. The reader in src/core2/elections-calendar.ts already takes a row. A place whose code cannot be fetched stays at 90 days tagged ESTIMATED with the error. Narrow the stopgap row to the places still estimated.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the result must move money, people or places in a generated world, in all 56 places. One rule, all 56 places: nothing names a state, county or city in code; place facts live in data. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. Speed: the work runs monthly or on the day something changes and keeps a played year under two minutes (npm run speed:year).

**Done when.** A second session picks a place from all 56 (name and seed written down), vacates a seat in a played year in dev mode, and finds the special election dated by that place's row (the statute section named in the election record's basis). src/core2/data/elections/special-election-law.json holds a row for every place and office family, each tagged with its quote, and the stopgap row names only the places still estimated.

**Waits on.** Nothing.

**Files.** src/core2/data/elections/special-election-law.json, src/core2/elections-calendar.ts, src/core2/data/stopgaps/gov.json

**Notes.** Written by the stand-in triage (T1). The lead adds the checked line after reading.
