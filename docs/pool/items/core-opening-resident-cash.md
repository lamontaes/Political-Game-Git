---
id: core-opening-resident-cash
title: "Opening cash: most residents hold none, so no estate passes"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from core-needs-core-91 (Oct 15, 2026)"
claimed-at:
---

**What.** At the start of a small town (Kellogg, Idaho in an earlier run) only 44 of 276 residents held any cash in their own account (median $0, 90th percentile $702.89), so a resident's estate is nearly always empty and nothing passes by will or intestacy. Start each resident's cash from the Survey of Consumer Finances by age and household (average with a per-world spread, marked as an estimate with its source), so a death leaves something to inherit.

**Rules.** An effect is a read; one rule, all 56 places; estimate, never UNKNOWN; speed: measure before and after on the same base and machine, one process at a time.

**Done when.** In a one-year played world in a drawn place (buildBenchWorld) a death leaves an estate that passes by will or intestacy, named by record id, and the share of residents holding cash matches the SCF's within its spread. The owner plays it: a death in a small town leaves an estate that someone inherits.

**Files.** src/core2/modules/residents.ts, src/core2/population.ts

**Notes.** Split out of `core-needs-core-91`; verify against main before starting.
