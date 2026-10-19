---
id: world-counted-reads-jobs
title: "The jobs engine reads counted groups, not a household record per counted person"
area: world
kind: stopgap
priority: 2
size: M
status: done
claimed-by: claude/world-counted-reads-jobs
pr: #4852
blocked-on:
source: "split from core-stopgap-counted-groups-faked-mechanic (SG-CORE-counted-person-views), Oct 15"
claimed-at: 2026-10-16T23:56:23.321Z
---

**What.** `modules/jobs.ts` walks `rt.households.values()` (lines near 503, 1813 and 2058) to match counted workers to openings, quits and rates, getting a household record built on demand from the group's packed columns. Read the groups' counts and fields (and the counted jobs table) instead, and fill in a person only when one is picked by name. Today the stand-in builds a person or household record with no past and no ties for every counted member the engine touches. A counted group is read with the same rule as a full person, times its count, so the engine's total must not change.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count, and a filled-in person matches the group's records. Replace, never layer: the engine's use of the built record is deleted in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body) the jobs engine's totals equal the old per-person totals by group record id, no call of the household view remains in the engine, and the engine's tests and the counted-groups test pass.

**Files.** src/core2/modules/jobs.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Part of retiring SG-CORE-counted-person-views (src/core2/data/stopgaps.json). place-prices already reads the store's live households and counts directly. Candidacy reaches counted people only through campaigns.
