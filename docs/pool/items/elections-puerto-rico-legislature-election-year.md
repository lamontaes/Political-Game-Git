---
id: elections-puerto-rico-legislature-election-year
title: "Puerto Rico's legislature is seated as if elected in 2022, though it votes with the presidential cycle (2020, 2024)"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Nov 1 (elections-past-race-votes-from-electorate)
lead: governing
---

**What.** In Añasco, Puerto Rico (7202680, seed plv-2 draw 32) and Aceitunas, Puerto Rico (7200186), every seat of both chambers of the Legislative Assembly holds a term elected on 2022-11-08, so the opening's paper reports a 2022 legislative election and its turnout uses the off-year ratio. Puerto Rico's general elections, legislature included, fall every four years with the U.S. presidential election (2020, 2024). The seat's election year comes from `seatElectionYear` in src/core2/offices-state.ts reading the chamber's term and stagger from data/research/offices/state-offices.json; find which part puts the cycle on 2022 and read the real cycle from data.

**Rules.** One rule, all 56 places: the cycle is read from each chamber's data (its term length and the year of its last election), never named for Puerto Rico in logic. Estimate, never UNKNOWN: the last election year carries its source.

**Done when.** In a drawn Puerto Rico place (place and seed in the PR body), every legislature seat's last election is 2024-11-05 and its next 2028-11-07, by seat id; a test checks every chamber in data that its seats' last election year falls on its own cycle; the other 55 places' chamber years are unchanged or corrected with a cited reason.

**Files.** src/core2/offices-state.ts, data/research/offices/state-offices.json

**Notes.** Found while checking past race totals; the totals themselves are right for the year the record gives.
