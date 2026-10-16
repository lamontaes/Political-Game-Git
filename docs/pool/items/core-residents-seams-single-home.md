---
id: core-residents-seams-single-home
title: "The counted-worker seams live in one file"
area: core
kind: cleanup
priority: 3
size: S
status: in-pr
claimed-by: claude/residents-seams
pr: #4718
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T11:05:38.510Z
---

**What.** `rerateCountedJob` is defined in modules/residents.ts and its siblings in residents-economy.ts, and `rerateCountedJob` scans every flow per call. Keep one home for the seams and index the flows by job.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** One definition of each seam, no whole-flow scan on a rerate, and the speed guard unchanged or better in a drawn town.

**Files.** src/core2/residents-economy.ts, src/core2/modules/residents.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.
