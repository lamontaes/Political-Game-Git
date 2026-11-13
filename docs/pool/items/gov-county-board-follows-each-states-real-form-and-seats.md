---
id: gov-county-board-follows-each-states-real-form-and-seats
title: "Counties in 38 states get one made-up board (seven nonpartisan commissioners) instead of their state's real governing body"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** In Danville, Iowa, Politics, Government lists the 'Des Moines County Board of Commissioners', 7 seats by district, 'Nonpartisan', and News prints 'The Des Moines County Board of Commissioners rejects ...'. The Advanced start lists Commissioner, Coroner, County assessor, County clerk, County treasurer, Sheriff and County attorney. Iowa's real county body is a partisan Board of Supervisors of three or five members (Iowa Code § 331.201), and Iowa elects an auditor, a treasurer, a recorder, a sheriff and an attorney; the assessor is appointed by a conference board, there is no elected county clerk, and the medical examiner is appointed. Every state the data does not cover gets the same seven-seat board, while real county governments differ by state: three or five commissioners are most common, and some states have supervisors, county councils, a judge-executive with a fiscal court, police juries, or no county government at all. Seen: Politics, Government (Local), the Advanced start's list of offices, and News stories about the county.

**Cause.** Found in code: countyGoverningBodyRules in src/core2/gov-rules/county-governing-body-rules.ts (line 175) reads data/research/local-government/county-governing-bodies.json, whose states cover only AZ, CA, ID, ME, MN, MO, MT, NV, OH, OR, WA and WV. Every other state falls to nationalAverage (7 seats, 'Board of Commissioners', 'Commissioner'). The schedule row data/research/government/county-election-schedule-by-state.json already marks IA partisan, but no member gets a party, so the split shows 'Nonpartisan' (src/bench/play.mjs, splitBar). The row offices come from countyElectedRowOffices (src/core2/gov-rules/county-row-offices.ts, line 97). Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026).

**Fix.** Give every state its real county form from data: the body's name, its members' title, its seat count (or seats by county population where the state's law sets that), whether it is partisan, and the offices the county elects, each with its statute or source. A state with no county government gets no county body. Iowa's row is a Board of Supervisors of three or five seats, partisan, with the elected offices above. No row prescribes a common default; nationalAverage stays only as the estimate a state without a sourced row falls back to, marked as an estimate. Members of a partisan body get their party. Data only, one row per state; the PR body lists each state changed with its citation.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: place facts live in data. Research before building: cite each statute.

**Done when.** A second session starts a life on main in a drawn place in a state not in the old list, named with its seed, and Politics names that state's county body, its seat count and its parties as the state's source says (for Iowa, a Board of Supervisors of three or five). A test fails on any state with county government whose row is missing, and on a state with none that is given a body.

**Waits on.** Nothing.

**Files.** data/research/local-government/county-governing-bodies.json, src/core2/gov-rules/county-governing-body-rules.ts, src/core2/gov-rules/county-row-offices.ts

**Notes.** Related: gov-vermont-county-has-a-board-of-commissioners (Vermont should have no board at all); do both rows together or in order.
