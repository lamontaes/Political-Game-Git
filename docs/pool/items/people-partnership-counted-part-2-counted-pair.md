---
id: people-partnership-counted-part-2-counted-pair
title: "Counted adults partner by the same weighing as full people, times their count"
area: people
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: people-orientation-record, people-partnership-counted-part-1-counted-leave-home
blocked-on:
lead: lives
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-partnership-counted in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Counted adults never partner, so counted household types stay as they opened. Full people partner by a monthly pull built from the ACS first-marriage pace, read against each person's recorded orientation. Give the counted tier the same pull times its count, merging counted households into couples by the orientation shares. Feeds: people-partnership-counted.

**Cause.** Found in code: src/core2/modules/partnerships.ts (header, line 33, and COUNTED_STOPGAP at line 88) leaves the counted population's partnerships as their own unit; the stopgap row SG-LIVES-partner-counted is in src/core2/data/stopgaps/lives.json (line 75): the counted population's household types never change by partnering or parting.

**Fix.** Add the monthly counted partnering step that merges two counted households' members into one counted household by the full people's pull, reading the orientation shares, with rent and cash by journal record.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count, and the rates only check totals. No dice: the weights, not a chance, decide how many go. Wire to the world: every move carries rent and cash by journal record. One rule, all 56 places: no place is named in code.

**Done when.** A second session runs a one-year played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) and sees counted couples form as counted-household records with the members who moved, the town's counted people unchanged by the moves, and the housing engine reading each new household's rent. src/core2/counted-partnering.test.ts states it and names the place and seed.

**Waits on.** people-orientation-record and people-partnership-counted-part-1-counted-leave-home.

**Files.** src/core2/modules/partnerships.ts, src/core2/counted-groups.ts, src/core2/modules/counted-moves.ts, src/core2/data/opening-partnership.json, src/core2/data/stopgaps/lives.json, src/core2/counted-partnering.test.ts (new)
