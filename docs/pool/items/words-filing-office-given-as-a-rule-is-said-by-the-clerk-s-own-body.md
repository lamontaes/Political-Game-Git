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
source: second words reader on the greeting fix #9378, Nov 15
lead: words
---

**What.** At South Vienna, Ohio (seed greet6) the U.S. Representative counter's clerk greets with "with the board of elections of the most populous county in the district", and two research notes give an office only as a rule ("Board of elections of the most populous county in the district", "General registrar of the city or county where the town lies"). Seen: the clerk's greeting at the filing counter.

**Cause.** Found in code: two parts. `saidOffice` in `src/director/filing-visit.ts` returned the note's first office as written, so the rule was said aloud; and the person cast at the counter did not belong to the body the rule points to: `stateClerkFor` in `src/core2/modules/filing-clerk.ts` cast the state's chief election official, titled "Ohio Secretary of State" by `seatElectionChief`, for any state or federal office that was not the Secretary of State, and `localClerkFor` cast the town clerk for the Virginia registrar rule.

**Fix.** `ruleOfficeBody` in the new `src/core2/filing-rule-office.ts` resolves a rule to a named county only where the game can know it: the county or city the town lies in (`placeCounty`), or the most populous county wholly inside the town's 2026 congressional district when it is larger than every county the district shares with another (`data/research/district-lines-2026/lines-2026.json`, `countyPopulation2024`). Otherwise the body is the office named without a county ("board of elections", "general registrar"). `filingRulesFor` in `src/core2/modules/elections.ts` carries that body as the contest's office, `seatRuleFilingOfficers` in `src/core2/modules/executive.ts` seats a drawn officer at it, `stateClerkFor` and `filingClerkFor` cast that person, and `openBenchFilingVisit` passes the body to the greeting. The raw rule stays in the filing data. The player sees it at the clerk's greeting and the line that opens the visit.

**Time box.** 1 hour.

**Rules.** No dice. One rule, all 56 places: no place is named in logic.

**Done when.** A second session plays the South Vienna Ohio counters (seed greet6): the clerk is named, the greeting says "the board of elections" with no county, and none reads the rule aloud; a Virginia town (Manassas, seed greet7) names its city general registrar; names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/filing-rule-office.ts, src/core2/modules/executive.ts, src/core2/modules/filing-clerk.ts, src/director/filing-visit.ts, src/bench/filing.ts

**Notes.** The game holds no state-district-to-county relationship, so a state legislative district never names a county. A congressional district's largest county that is split with another district has no recorded population inside this one (it could be the largest), so South Vienna's district 15 (Franklin County, split with district 3) names none either. Gap: the Census block-to-district-and-county relationship with population (the 2020 block files the lines compiler already reads) would let both resolve; the 2026 lines compiler in `scripts` is the place to add it. A rule applies only in a state whose filing data gives it (Ohio, Virginia); nothing here assumes another state does.
