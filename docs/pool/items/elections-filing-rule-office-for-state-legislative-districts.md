---
id: elections-filing-rule-office-for-state-legislative-districts
title: "Ohio's state legislative races file with 'the most populous county in the district', and the game holds no state district lines to resolve it"
area: elections
kind: feature
priority: 3
size: M
status: open
standard: 2
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: found by the filing-office-as-a-rule thread, Nov 15
lead: elections
---

**What.** Ohio's state House and state Senate races give their filing office as the board of elections of the most populous county in the district. `ruleOfficeBody` in `src/core2/filing-rule-office.ts` resolves it only for U.S. House races, from `data/research/district-lines-2026/lines-2026.json`, which holds congressional lines only, so a state legislative race at that counter is not resolved and shares the U.S. House race's counter and clerk. Seen: the Ohio filing counter at South Vienna (seed greet6), where State Senator and State Representative show under the Franklin County board.

**Cause.** Found in code: `ruleOfficeCounty` in `src/core2/filing-rule-office.ts` returns null for any family but `usHouse`, because no file in `data/research` maps a town or county to its state legislative district (`src/core2/legislative-district-results.ts` holds votes by district, not the district's counties).

**Fix.** Source the state legislative district to county map (the Census block assignment files for the state's lower and upper chambers, as the congressional file was sourced, or the place's own estimate marked ESTIMATED with its spread), and read it in `ruleOfficeCounty` for `stateLegislative` and the upper chamber; `seatRuleFilingOfficers` in `src/core2/modules/executive.ts` then seats one officer per body, and the counter menu keeps the races of each body apart. The player sees it at the clerk's greeting when filing for a state legislative seat in Ohio.

**Time box.** 3 hours.

**Rules.** No dice. One rule, all 56 places: no place is named in logic. Estimate, never UNKNOWN.

**Done when.** A second session plays the Ohio State Representative counter at a drawn Ohio town and the clerk is cast at, and the greeting names, the board of the most populous county of that state district, and the U.S. House race at the same town still names its own; names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/filing-rule-office.ts, src/core2/modules/executive.ts, src/bench/filing.ts

**Notes.** The state legislative lines are not in the repository and the container cannot reach census.gov; this is a data-sourcing step.
