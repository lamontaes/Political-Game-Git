---
id: world-lodes-commutes
title: "Unplaced workers get recorded jobs, including out-of-town commutes"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** Residents' pay from jobs the opening could not place is a stand-in (`SG-CORE-unplaced-workers-income`). Make them jobs: commutes from LEHD LODES for work outside the town, and the town's missing industries. The workers then show an employer or commute destination in their pay record. The commute shares come from the LODES tables the place data already carries.

**Rules.** One rule, all 56 places: commute shares come from place data, never a named state. Research calibrates totals and never decides one worker's job.

**Done when.** In a drawn place from all 56 in buildBenchWorld, an unplaced worker's pay comes from a job record (employer or commute destination) by record id over a one-year run, and SG-CORE-unplaced-workers-income is resolved with a test.

**Files.** src/core2/modules/jobs.ts, src/core2/tooling/generated-world.ts, src/core2/data/stopgaps.json

**Notes.** core.md line 179 (3), checked Oct 15.
