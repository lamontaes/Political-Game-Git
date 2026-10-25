---
id: people-partnership-counted-pair-and-split
title: "Counted adults partner and separate by the same weighing as full people, times their count"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after: people-partnership-forms,people-partnership-ends,people-partnership-counted-leave-home,people-orientation-record
blocked-on:
milestone:
source: split from people-partnership-counted by pool feeder Oct 20
---

**What.** Give the counted tier the partnering and separating rules. Two counted singles of the same place and group in the age band weigh partnering, and a counted couple under strain weighs separating, by the same terms as full people in partnerships.ts, with the closeness a counted pair is given by the place (a counted person has no recorded ties, so closeness is the typical closeness of the group they share, an estimate). Who can pair reads the orientation record or, for the counted tier, the group's same-sex couple share. A pair that forms becomes one counted household (using the member-move call built in the leave-home part) and a separation splits one out, the leaver taking a rent contract and a cash share by journal record. The marriage and divorce law in force where they live allows or limits it.

**Rules.** One model, two tiers: the same rule as a full person times the count; the rates (CDC marriages and divorces per thousand) check totals and never pick a couple. No dice: closeness, ages, pay, rent and the law decide how many act. Wire to the world: a counted couple's home changes by moving a member within the town, so no cash leaves it and every dollar balances. Estimate, never UNKNOWN: group closeness is the typical closeness of the group, marked ESTIMATED with its source. One rule, all 56 places: no place is named in code. Nobody gets a full past or memory until filled in; a filled-in person matches the household's recorded partner.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) counted couples form and counted couples separate, each as a counted-household record id with the members who moved, the town's counted people unchanged by the moves, and the housing engine reading each new household's rent. A test in src/core2/counted-partnering.test.ts states it and names the place and seed.

**Files.** src/core2/modules/partnerships.ts, src/core2/counted-groups.ts, src/core2/modules/counted-moves.ts, src/core2/data/partnerships/parameters.json, src/core2/counted-partnering.test.ts

**Notes.** Split from people-partnership-counted Oct 20.
