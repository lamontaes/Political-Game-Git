---
id: people-kin-move-regression
title: "Pin the Scenic, Arizona kin move date fix"
area: people
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** Opening Scenic, Arizona (seed 17290bfc...) once crashed on a kin move dated after the start. The clamp is in `opening-kin.ts`, but no test names the case.

**Rules.** Tests draw a place; a regression names its place and seed.

**Done when.** A test opens Scenic, Arizona with that seed and a drawn place and asserts every kin move date is at or before the start, naming the place, seed and one kin record id.

**Files.** src/core2/opening-kin.test.ts

**Notes.** core.md line 223, checked Oct 15; the full seed is in the core.md bullet.
