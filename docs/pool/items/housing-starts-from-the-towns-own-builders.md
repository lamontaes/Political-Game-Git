---
id: housing-starts-from-the-towns-own-builders
title: "A town starts the homes its own builders have the hands for, not its state's published permit rate"
area: world
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pins-housing-builders
pr: 9940
blocked-on:
after:
lead: world
source: Justice lane, Nov 17, 2026, family 25 of the CTO's LIFT THE PINS list (issue 9747, comments 6936897718 and 6936902790), part B item 6
model: sonnet
effort: medium
root: none
---

**What.** Every town's builders started houses and apartment units at its state's published permits per thousand people, moved once per world, so two towns of one state with different builders started alike. The owner ruled on Nov 16 that everything comes from the simulation and nothing is pegged to real numbers.
Seen: how many new homes a town's builders start in a played year, in dev mode's housing records.

**Cause.** Found in code: `buildMonth` in src/core2/housing-construction.ts read `permitRates(usps, seed)`, the state's Census permit rate times a seeded offset, and multiplied it by the town's residents; no builder, firm or worker of the town entered it.

**Fix.** `builderHeads` in src/core2/housing-construction.ts counts the heads on the staff of the town's open construction firms (full workers plus what their counted jobs stand for); `buildMonth` starts that many heads times two fitted strengths (`housingSingleStartsPerBuilderYear`, `housingMultiUnitsPerBuilderYear`, fitted once on 55 drawn towns) a year, at the same market signal as before. `permitRates`, `publishedPermitRates`, the state and national permit tables and `housingWorldPermitSpreadShare` are deleted. A town whose builders close starts fewer homes, later; a town with no construction firm starts none until one opens.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** No dice: starts come from builders' records, never a seeded draw around a figure. One rule, all 56 places: the same two strengths apply everywhere and no place is named.

**Done when.** A second session opens a drawn place with a construction firm, closes its largest construction firm in dev mode on day 10, and sees that town start its homes later or fewer over a played year than the same world left alone, and src/core2/housing-construction.test.ts passes on main.

**Waits on.** PR B items 7 to 10 (cost from labor and materials, inventory, months to build, opening rental units), which follow in the same family.

**Files.** src/core2/housing-construction.ts, src/core2/data/housing/parameters.json, src/core2/data/housing/construction.json, src/core2/housing-construction.test.ts, src/core2/law-wiring-housing.test.ts, src/core2/realistic-not-real.test.ts
