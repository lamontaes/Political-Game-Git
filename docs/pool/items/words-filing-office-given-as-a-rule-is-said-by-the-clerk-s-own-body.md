---
id: words-filing-office-given-as-a-rule-is-said-by-the-clerk-s-own-body
title: "A filing clerk says 'with the board of elections of the most populous county in the district', the record's rule for the office and not a name"
area: words
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
after:
blocked-on:
model: sonnet
effort: low
root: none
pr: 9389
pr: 9389
source: second words reader on the greeting fix #9378, Nov 15
lead: words
---

**What.** At South Vienna, Ohio (seed greet6) the U.S. Representative counter's clerk greets with "with the board of elections of the most populous county in the district", and two research notes give an office only as a rule ("Board of elections of the most populous county in the district", "General registrar of the city or county where the town lies"). Seen: the clerk's greeting at the filing counter.

**Cause.** Found in code: two parts. `saidOffice` in `src/director/filing-visit.ts` returned the note's first office as written, so the rule was said aloud; and the person cast at the counter did not belong to the body the rule points to: `stateClerkFor` in `src/core2/modules/filing-clerk.ts` cast the state's chief election official, titled "Ohio Secretary of State" by `seatElectionChief`, for any state or federal office that was not the Secretary of State, and `localClerkFor` cast the town clerk for the Virginia registrar rule.

**Fix.** `ruleOfficeBody` in the new `src/core2/filing-rule-office.ts` resolves a rule to the named body from the game's own data: the most populous county of the town's 2026 congressional district (`data/research/district-lines-2026/lines-2026.json`, `countyPopulation2024`), or the county or city the town lies in (`placeCounty`). `seatRuleFilingOfficers` in `src/core2/modules/executive.ts` seats a drawn officer at that body (on the county's payroll where it is the player's county), `stateClerkFor` and `filingClerkFor` cast that person, `openBenchFilingVisit` passes the body to the greeting, and `saidOffice` returns null for a rule. Where the game has no such body (a state legislative district: only congressional lines are held) no one is seated and the greeting names no body. The player sees it at the clerk's greeting and the line that opens the visit.

**Time box.** 1 hour.

**Rules.** No dice. One rule, all 56 places: no place is named in logic.

**Done when.** A second session plays the South Vienna Ohio U.S. Representative counter (seed greet6) and the clerk is cast at, and the greeting names, the Franklin County board of elections, and a Virginia town (Manassas, seed greet7) names its county or city general registrar; names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/filing-rule-office.ts, src/core2/modules/executive.ts, src/core2/modules/filing-clerk.ts, src/director/filing-visit.ts, src/bench/filing.ts

**Notes.** Ohio state legislative races (lower and upper chamber) share the counter's office note; the game holds no state district lines, so they are not resolved and the counter is cast for the U.S. House race. Filed: `elections-filing-rule-office-for-state-legislative-districts`.
