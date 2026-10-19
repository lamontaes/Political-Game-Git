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
after: people-partnership-forms,people-partnership-ends,people-leave-parents-home
source: added with npm run pool -- add
---

**What.** Full people can partner, separate and leave home by traits, closeness and money, but counted adults do not. Give counted adults the same rules, times their count, so the counted population's households form and split from causes. A change's reach is the sum over groups plus the full people.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person, times its count. No dice: partnering follows closeness, age fit and money, never a roll.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, counted adults form and end partnerships and household moves by the same rule as full people, shown by group and household record ids, with the totals within the sourced spread of the real rates; a test in src/core2 states it.

**Files.** src/core2/modules/counted-moves.ts, src/core2/opening-partnership.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
