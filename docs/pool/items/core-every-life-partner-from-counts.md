---
id: core-every-life-partner-from-counts
title: "A partner met elsewhere comes out of their place's counted people instead of being added on top"
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

**What.** When a single adult living elsewhere marries, the partnerships module (src/core2/modules/partnerships.ts, PR #7082) generates the partner as a new full person on top of the population. So the place or state they live in counts one more resident than its data: the counted-moves engine reads them as a resident of a counted place, and a state's coarse counts are not reduced. The speed lead found this through the unit 4 ablation, and under one model, two tiers a filled-in person must match the records already kept.

**Rules.** Two-level population: the partner is one of the people the counts already hold where they live, taken out of the counts as they become full. One model, two tiers: a counted place gives a counted single adult of fitting age and sex, and a state's coarse age bands give up one person in the partner's band. No dice: who is taken follows the partner's age and sex from the CPS age gap, seeded by the pair.

**Done when.** In a generated world of a place drawn from all 56, after a year the counted people of each place or state that a partner came from are lower by exactly the partners taken from it, and the total population including full people is unchanged by partnerships (src/core2/partnerships.test.ts, three draws).

**Files.** src/core2/modules/partnerships.ts, src/core2/modules/counted-moves.ts, src/core2/modules/residents.ts, src/core2/partnerships.test.ts

**Notes.** Filed by the lives lead, Nov 1, on the speed lead's point after the unit 4 ablation (PR #7082).
