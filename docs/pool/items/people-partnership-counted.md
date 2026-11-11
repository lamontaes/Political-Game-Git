---
id: people-partnership-counted
title: "Counted adults partner, separate and leave home by the same rules as full people, times their count"
area: people
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on: people-partnership-counted-part-1-counted-leave-home, people-partnership-counted-part-2-counted-pair, people-partnership-counted-part-3-counted-separate
after: people-leave-parents-home, core-household-membership-change, people-partnership-forms, people-partnership-ends, people-orientation-record
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: low
root: design-one-model-two-tiers
lead: lives
checked: fable 2026-11-10
---

**What.** This is the roll-up for giving the counted tier the three partnership rules that full people already have in src/core2/modules/partnerships.ts: leaving a parent's home, partnering and separating. Nothing is built under this id. It is done when its three parts are done, with the counted households of a town turning over by the same rules as full people, times their count. The folded-in done-when lines from the Oct 25 combination are kept in the Notes. Seen: the town's household count and its rents year over year, as counted households form and part.

**Cause.** Found in code: src/core2/modules/partnerships.ts (header, line 33, and COUNTED_STOPGAP at line 88) leaves the counted population's partnerships as their own unit; the stopgap row SG-LIVES-partner-counted is in src/core2/data/stopgaps/lives.json (line 75): the counted population's household types never change by partnering or parting.

**Fix.** Build the three parts: counted young adults leave home, counted adults partner, counted couples separate, each as counted-household records.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count, and the rates only check totals. No dice: the weights, not a chance, decide how many go. Wire to the world: every move carries rent and cash by journal record. One rule, all 56 places: no place is named in code.

**Done when.** A second session runs a one-year played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) and sees a group's counted households show young adults leaving, couples forming and couples separating, each as a counted-household record id naming the members who moved, with the town's counted population unchanged by those household moves. src/core2/counted-home-leaving.test.ts and src/core2/counted-partnering.test.ts prove it.

**Waits on.** Its three parts: people-partnership-counted-part-1-counted-leave-home, people-partnership-counted-part-2-counted-pair and people-partnership-counted-part-3-counted-separate. The after: line names people-partnership-forms and people-partnership-ends, proposed for drop because built on main.

**Files.** src/core2/modules/partnerships.ts, src/core2/counted-groups.ts, src/core2/modules/counted-moves.ts, src/core2/data/opening-partnership.json, src/core2/data/stopgaps/lives.json, src/core2/counted-home-leaving.test.ts (new), src/core2/counted-partnering.test.ts (new)

**Notes.** Follows the People partnership stack (PRs 4948, 4959, 4961, 4963, 4970). Needs a counted-store call that moves one member of a counted household into a new household record of its own (the weight and the household's cash share follow), the counterpart of `changeHouseholdV1` for full people. Check `SG-PEOPLE-partnership-orientation`, which pairs only a woman and a man, before building: a counted pair needs the same rule.

Oct 20 (pool feeder): spec written; the original body was already a good spec; it was split into two parts and the owner's Oct 19 pairing ruling (orientation) became people-orientation-record, which the pair-and-split part waits on.

Folded in Oct 25 from people-partnership-counted-leave-home. Its done when: In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) a group's counted households show young adults leaving a parent's home, each as a new counted-household record id with the member who moved, the housing engine reading the new household's rent, and the place's counted people unchanged by the move. A test in src/core2/counted-home-leaving.test.ts states it and names the place and seed.

Folded in Oct 25 from people-partnership-counted-pair-and-split. Its done when: In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) counted couples form and counted couples separate, each as a counted-household record id with the members who moved, the town's counted people unchanged by the moves, and the housing engine reading each new household's rent. A test in src/core2/counted-partnering.test.ts states it and names the place and seed.

Deferred Oct 25: nothing on screen reads it yet.
