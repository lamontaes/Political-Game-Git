---
id: research-office-forfeiture-by-state
title: "Research: each state's rule for losing office on conviction and for forfeiting a bribe's proceeds"
area: gov
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

**What.** A convicted official loses the office on the day of conviction and all the bribe money, in every place, whatever the state's own rule.

**Cause.** Found in code: src/core2/justice-law.ts lines 238 to 262 and 309 (stopgap SG-GOV-justice-forfeiture-by-place, open in src/core2/data/stopgaps/gov.json): every place vacates an office on a felony conviction on the day of the conviction and forfeits all of a bribe's proceeds; the sentencing ranges are read per place from data/research/justice/sentencing-ranges-2026.json.

**Fix.** For each of the 56 places, find the statute or constitution section that says when a convicted official's office is vacated (on conviction, on sentencing, after appeals) and what a court may forfeit from a bribe, quote it, and add a row to the justice research file src/core2/justice-law.ts reads (SOURCED, or ESTIMATED with the reason where the code cannot be fetched). Make the vacancy day and the forfeited share read the row, following the bribery-grade rows (item research-gov-sourced-parameters). Narrow the stopgap row to the places still estimated.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the result must move money, people or places in a generated world, in all 56 places. One rule, all 56 places: nothing names a state, county or city in code; place facts live in data. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. Speed: the work runs monthly or on the day something changes and keeps a played year under two minutes (npm run speed:year).

**Done when.** A second session picks a place from all 56 (name and seed written down), convicts a bribed official in a played year in dev mode, and finds the office vacated on the day that place's row names and the proceeds forfeited at its share, each by record id. The row's quote matches the cited section and the stopgap names only the places still estimated.

**Waits on.** Nothing.

**Files.** data/research/justice/sentencing-ranges-2026.json, src/core2/justice-law.ts, src/core2/data/stopgaps/gov.json

**Notes.** Written by the stand-in triage (T1). The lead adds the checked line after reading.
