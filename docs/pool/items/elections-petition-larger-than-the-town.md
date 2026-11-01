---
id: elections-petition-larger-than-the-town
title: "A tiny town's petition can ask more signatures than the town can give"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (found in phase A runs)
lead: governing
---

**What.** In Johnson MN (2732012, seed 3e569f4194a9e160) the player's council petition needed 30 signatures, and a month of doors reached the same few households 389 times for 19 signers, so the player never made the ballot in two races. A town of a few dozen adults cannot give thirty valid signatures, so either the town's petition row or the fallback that set it is wrong for a place that small. This item finds which one and fixes it by one rule for every small place.

**Rules.** Estimate, never UNKNOWN: the petition requirement a place shows comes from its own researched row or a sourced fallback scaled to the electorate, never a fixed count larger than the town, applied by one rule to all 56 places.

**Done when.** A data test over every locality in all 56 places finds no council petition whose required signatures exceed the town's eligible adults, and path-check in Johnson MN with seed 3e569f4194a9e160 puts the player on the ballot.

**Files.** src/core2/modules/elections.ts

**Notes.** TODO
