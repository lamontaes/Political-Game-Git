---
id: people-partnership-counted-leave-home
title: "Counted young adults leave a parent's home by the same weighing as full people, times their count"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after: people-leave-parents-home,core-household-membership-change
blocked-on:
milestone:
source: split from people-partnership-counted by pool feeder Oct 20
---

**What.** Give the counted tier the leave-home rule. A full young adult weighs staying against a home of their own each month in `src/core2/modules/partnerships.ts` (the weights in `src/core2/data/partnerships/parameters.json`); a counted young adult never does, so the counted households' makeup stays as opened apart from deaths, births and moves out of town. Add the same weighing for counted young adults who share a household with a parent, reading the group's columns (age, the household's pay and rent) and counted at the group's weight. Those who go form a household of their own in the same place, so it needs a counted-store call that splits one member out of a counted household into a new household record (the counterpart of `changeHouseholdV1` for full people), with the household's cash share, rent contract and group following the member. Background households may split this way when cheap and as often as real life (owner, Oct 20); the player's own family never leaves the player before 1.0.

**Rules.** One model, two tiers: a counted group is weighed with the same terms as a full person times its count; real rates (ACS share of 25 to 34 year olds living with a parent) check totals and never pick a household. No dice: the weights decide how many go, the strongest pulls first. Wire to the world: the split moves the member's cash share and a rent or mortgage contract by journal record and every dollar balances. One rule, all 56 places: no place is named in code. Nobody gets a full past or memory until filled in, and a person filled in later matches the household record they left or joined.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) a group's counted households show young adults leaving a parent's home, each as a new counted-household record id with the member who moved, the housing engine reading the new household's rent, and the place's counted people unchanged by the move. A test in src/core2/counted-home-leaving.test.ts states it and names the place and seed.

**Files.** src/core2/modules/partnerships.ts, src/core2/counted-groups.ts, src/core2/modules/counted-moves.ts, src/core2/data/partnerships/parameters.json, src/core2/counted-home-leaving.test.ts

**Notes.** Split from people-partnership-counted (which covered leaving, partnering and separating) Oct 20. The partnership stack (PRs 4948, 4959, 4961, 4963, 4970) is not on main yet; this builds on it.
