---
id: core-opening-resident-cash
title: "Opening cash: most residents hold none, so no estate passes"
area: core
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/core-opening-resident-cash
pr: #4806
blocked-on:
milestone:
source: "split from core-needs-core-91 (Oct 15, 2026)"
claimed-at: 2026-10-16T18:37:09.853Z
---

**What.** At the start of a small town (Kellogg, Idaho in an earlier run) only 44 of 276 residents held any cash in their own account (median $0, 90th percentile $702.89), so a resident's estate is nearly always empty and nothing passes by will or intestacy. Start each resident's cash from the Survey of Consumer Finances by age and household (average with a per-world spread, marked as an estimate with its source), so a death leaves something to inherit. The player notices that a small town's residents have money to leave.

**Rules.** An effect is a read; one rule, all 56 places; estimate, never UNKNOWN; speed: measure before and after on the same base and machine, one process at a time.

**Done when.** In a one-year played world in a drawn place (buildBenchWorld) a death leaves an estate that passes by will or intestacy, named by record id, and the share of residents holding cash matches the SCF's within its spread. The owner plays it: a death in a small town leaves an estate that someone inherits.

**Files.** src/core2/modules/residents.ts, src/core2/population.ts

**Notes.** Split out of `core-needs-core-91`; verify against main before starting.

Looked at 2026-10-16: the cash half is already met on main. In two drawn towns (seeds cash-a and cash-b, `drawPlace(seed, "resident-cash")`, two-level `buildBenchWorld`) 81% and 76% of full-resident adults hold cash (medians about $980 and $860); every householder with a job or a home of their own holds some, and the zeros are 18-year-olds living with their parents and kin outside town. The estate half is not shown by a played year: four drawn places (est1:0 to est1:3: Glide, Oregon; Waldport, Oregon; Chetek, Wisconsin; New Hope, Oregon) ran three years each and no full resident died holding cash, because a town has only about 100 full residents. A counted resident's death (`removeCountedPerson`, `src/core2/births-counted.ts`) writes no estate, so most deaths pass nothing. Next: give a counted death an estate through the group (see core-counted-estates), then show one in a played year.
