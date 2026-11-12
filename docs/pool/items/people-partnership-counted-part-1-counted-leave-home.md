---
id: people-partnership-counted-part-1-counted-leave-home
title: "Counted young adults leave a parent's home by the same weighing as full people, times their count"
area: people
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: people-leave-parents-home
blocked-on:
lead: lives
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-partnership-counted in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A counted group's young adults never leave a parent's home, so the town's counted households keep their opening shape. Full people leave by weighing work, pay and the rents on offer (people-leave-parents-home). Give the counted tier the same weighing times its count, with a counted-store call that moves one member of a counted household into a new household record of its own (the weight and the household's cash share follow), the counterpart of changeHouseholdV1 for full people. Seen: new renter households forming in town as counted young adults move out.

**Cause.** Found in code: src/core2/modules/partnerships.ts (header, line 33, and COUNTED_STOPGAP at line 88) leaves the counted population's partnerships as their own unit; the stopgap row SG-LIVES-partner-counted is in src/core2/data/stopgaps/lives.json (line 75): the counted population's household types never change by partnering or parting.

**Fix.** Add the counted-store call and the monthly counted young-adult review that uses the full people's weighing, so a counted household's member moves into a new counted household with rent read by the housing engine and the town's counted people unchanged.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count, and the rates only check totals. No dice: the weights, not a chance, decide how many go. Wire to the world: every move carries rent and cash by journal record. One rule, all 56 places: no place is named in code.

**Done when.** A second session runs a one-year played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) and sees a group's counted households show young adults leaving a parent's home, each as a new counted-household record id with the member who moved, the housing engine reading the new household's rent, and the place's counted people unchanged by the move. src/core2/counted-home-leaving.test.ts states it and names the place and seed.

**Waits on.** people-leave-parents-home (the full people's weighing).

**Files.** src/core2/modules/partnerships.ts, src/core2/counted-groups.ts, src/core2/modules/counted-moves.ts, src/core2/data/opening-partnership.json, src/core2/data/stopgaps/lives.json, src/core2/counted-home-leaving.test.ts (new)
