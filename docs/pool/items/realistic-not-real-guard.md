---
id: realistic-not-real-guard
title: "A test fails when two worlds share an audited statistic or open on the published one"
area: core
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/realistic-not-real-guard
pr: #6473
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at: 2026-10-28T01:35:04.157Z
---

**What.** A guard that builds two played worlds (buildBenchWorld) from two seeds on drawn places and checks every audited non-law statistic: fails when a value is equal in both worlds or equal to its published row. Added to the local gate list in the local-gate standing skill. The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed.

**Rules.** Estimate, never UNKNOWN: One rule, all 56 places: the places and seeds are drawn and named in the output. Statistics not yet fixed are listed in the test as known with their fix item, and the list only shrinks. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** The test is on main and listed in the local gate; it builds two played worlds with buildBenchWorld on drawn places and seeds, and fails when a fixed statistic is reverted to a copy of its published row.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/realistic-not-real.test.ts, .agents/rules/standing-skills/local-gate/SKILL.md

**Notes.** Filed by the realistic-not-real audit of Oct 27.
