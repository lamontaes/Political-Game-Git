---
id: core-old-imports-opening-employment
title: "The opening's employment allocation comes from the core, not the old town-employment, life-queries and jail-terms code"
area: core
kind: cleanup
priority: 2
size: M
status: in-pr
claimed-by: claude/old-imports-opening-employment
pr: #5071
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:11:11.377Z
---

**What.** `src/core2/opening-employment.ts` still reads the old engine for the town's employers and their staff: `organizationProfileAt` from `simulation/life-queries`, `jailTermOn` from `simulation/justice/jail-terms`, and the workplace tables and `townWorkplaceFor` from `simulation/living-world/town-employment` (with its generated meta). It matches each resident to a job from the old world's work relationships, roles and statuses. Move the workplace table (each kind of workplace, its roles and its weight in the sector mix) into a core data file, read the employers and their staff from the opening's own organization and job records, and read a resident's jail term from the core's justice records, so that nothing in the file imports `src/simulation`. The player notices nothing: the same town opens with the same jobs.

**Rules.** Replace, never layer: the old import is deleted in the same change, and the old workplace table is moved, not copied. One rule, all 56 places: the workplace table is data keyed by kind of work, with no place named. Build only what the golden path needs, and write fresh where that is simpler than carrying old code over.

**Done when.** In a drawn place from all 56 (name and seed in the PR body) `opening-employment.ts` imports nothing from `src/simulation`, the same town opens by record id (a fingerprint of the job rows, their employers and their holders equal before and after, via `buildBenchWorld`), `grep -n 'from "../simulation' src/core2/opening-employment.ts` prints nothing, and the file's tests pass; the PR counts the old lines removed.

**Files.** src/core2/opening-employment.ts, src/core2/data/opening-employment/, src/core2/population.ts

**Notes.** Written Oct 18 from the file's imports (it was a placeholder). Part of the opening town builder port; see core-port-world-scaffold and core-old-imports-14 (done, Oct 16 note) for the family. core-old-imports-opening-work follows this one because the schedules need each job's workplace.
