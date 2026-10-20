---
id: people-partnership-counted
title: "Counted adults partner, separate and leave home by the same rules as full people, times their count"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/pool-partnership
pr:
blocked-on: people-partnership-forms, people-partnership-ends, people-leave-parents-home
after: people-partnership-forms,people-partnership-ends,people-leave-parents-home
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:35:20.062Z
---

**What.** Full people leave a parent's home, partner and separate by a monthly weighing of their own situation (`src/core2/modules/partnerships.ts`); the counted adults of a town never do, so the counted tier's households stay as they were at the opening apart from deaths, births and moves out of town. Give the counted groups the same three rules. A counted young adult in a household with a parent weighs staying against a home of their own by the same weights, read from the group's columns (age, the household's pay and rent) and counted at the group's weight; those who go form a household of their own in the same place. Two counted singles of the same place and group in the age band weigh partnering, and a counted couple under strain weighs separating, by the same terms with the closeness a counted pair is given by the place (a counted person has no recorded ties, so closeness is the typical closeness of the group they share, an estimate).

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count; the rates check totals and never pick one household. No dice: the weights, not a chance, decide how many go. A counted couple's home changes only by moving a member within the town, so no cash leaves it and every dollar balances. One rule, all 56 places: no place is named in code. Nobody gets a full past or memory until filled in, and a filled-in person matches what the records already say.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a drawn place and a seed the builder did not choose, a group's counted households show young adults leaving a parent's home, counted couples forming and counted couples separating, each as a counted-household record id with the members who moved, the town's counted people unchanged by the moves, and a test beside `src/core2/home-leaving.test.ts` states it and names the place and seed.

**Files.** src/core2/modules/partnerships.ts, src/core2/counted-groups.ts, src/core2/modules/counted-moves.ts, src/core2/data/partnerships/parameters.json

**Notes.** Follows the People partnership stack (PRs 4948, 4959, 4961, 4963, 4970). Needs a counted-store call that moves one member of a counted household into a new household record of its own (the weight and the household's cash share follow), the counterpart of `changeHouseholdV1` for full people. Check `SG-PEOPLE-partnership-orientation`, which pairs only a woman and a man, before building: a counted pair needs the same rule.
