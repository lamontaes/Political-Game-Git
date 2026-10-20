---
id: core-m7-01-speed-and-memory
title: "M7-01 Speed and memory"
area: core
kind: feature
priority: 3
size: L
status: claimed
claimed-by: claude/m7-speed
pr:
blocked-on:
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-01"
claimed-at: 2026-10-20T00:47:48.244Z
---

**What.** A town's year in under 2 minutes; the new-game load (including the opening) fits a short loading screen; it runs on a minimum PC. (Owner: OPUS-CORE.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** Measured on a reference minimum-spec machine, with targets set from Steam's hardware survey.

**Files.** see spec

**Notes.** Measured Oct 19 (claude/m7-01-measure) on a 4-core, 15 GB cloud container, one process, `npm run speed:year -- --exclusive`: Nanawale Estates, Hawaii (seed m7-01-audit-a): build 13.3 s, one game year 74.4 s; Nobleton, Florida (seed m7-01-audit-b): build 6.8 s, one game year 34.3 s. Both are under the 120-second year. Not measured: memory, and any minimum-spec PC; the item's pass condition needs a reference minimum-spec machine with targets from Steam's hardware survey, which a cloud container is not. Two places is not a sweep of the slowest of 56. Priority 3 until scheduled. Verify how much is built before starting.
