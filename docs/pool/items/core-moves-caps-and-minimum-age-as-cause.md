---
id: core-moves-caps-and-minimum-age-as-cause
title: "The moves choice reads a minimum age and two caps instead of causes"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The moves engine reads three numbers as a cap or a cutoff, which Sliding scales and causes forbids: movesMinimumAge (nobody under 18 weighs leaving, and every child under it goes with a leaving parent), movesKinHoldCap (relatives past the fourth add no hold, and closeness to kin elsewhere stops counting past four) and movesHousingCostShareCap (a home's cost counts at most as the whole income, and a household with no income reads as exactly the cap). The research item research-core-parameters-sourced-parameters found nothing that sets them, because a cutoff is not a measure, and left them TUNABLE. Replace each with a cause: who decides alone from the place's age of majority in its law records, kin holds and pulls with diminishing returns in the count and closeness of kin, and a housing push that keeps rising with the share and reads a household with no income from its own cash and debts.

**Rules.** Sliding scales and causes: nothing in the moves choice may flip at a fixed number; the age a person decides alone comes from the law in force in their place, and kin and housing pressure slide. One rule, all 56 places: the age of majority is per-place data, never a state named in logic.

**Done when.** In a one-year buildBenchWorld run of a drawn place (seed named in the PR), src/core2/modules/moves.ts reads no cap or cutoff parameter, a departure record with five relatives in town shows a larger kin hold than one with four, a household with no income shows a housing push read from its own records, and src/core2/moves.test.ts passes.

**Files.** src/core2/modules/moves.ts, src/core2/data/moves/parameters.json, src/core2/modules/counted-moves.ts

**Notes.** TODO
