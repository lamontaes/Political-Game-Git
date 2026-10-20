---
id: people-partnership-counted
title: "Counted adults partner, separate and leave home by the same rules as full people, times their count"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-partnership-counted-leave-home,people-partnership-counted-pair-and-split
source: added with npm run pool -- add
claimed-at:
---

**What.** This is the roll-up for giving the counted tier the three partnership rules that full people already have in `src/core2/modules/partnerships.ts`: leaving a parent's home, partnering and separating. It was split Oct 20 into people-partnership-counted-leave-home (the counted-store call that moves one member into a household of their own, plus the leave-home weighing) and people-partnership-counted-pair-and-split (partnering and separating, reading the orientation record). Nothing is built under this id; it is done when both parts are done, with the counted households of a town turning over by the same rules as full people, times their count.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count, and the rates only check totals. No dice: the weights, not a chance, decide how many go. Wire to the world: every move carries rent and cash by journal record. One rule, all 56 places: no place is named in code.

**Done when.** Both parts are done: in a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose) a group's counted households show young adults leaving, couples forming and couples separating, each as a counted-household record id, proved by src/core2/counted-home-leaving.test.ts and src/core2/counted-partnering.test.ts.

**Files.** src/core2/modules/partnerships.ts, src/core2/counted-groups.ts, src/core2/modules/counted-moves.ts

**Notes.** Follows the People partnership stack (PRs 4948, 4959, 4961, 4963, 4970). Needs a counted-store call that moves one member of a counted household into a new household record of its own (the weight and the household's cash share follow), the counterpart of `changeHouseholdV1` for full people. Check `SG-PEOPLE-partnership-orientation`, which pairs only a woman and a man, before building: a counted pair needs the same rule.

Oct 20 (pool feeder): spec written; the original body was already a good spec; it was split into two parts and the owner's Oct 19 pairing ruling (orientation) became people-orientation-record, which the pair-and-split part waits on.
