---
id: core-old-imports-opening-employment
title: "The opening's employment allocation comes from the core, not the old town-employment code"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr: #5071
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `src/core2/opening-employment.ts` still reads the old engine for the town's employers and their staff: the workplace tables and `townWorkplaceFor` from `simulation/living-world/town-employment` (with its generated meta). It matches each resident to a job from the old world's work relationships, roles and statuses. Move the workplace table (each kind of workplace, its roles and its weight in the sector mix) into a core data file, read the employers and their staff from the opening's own organization and job records, so that nothing in the file imports `src/simulation`. The player notices nothing: the same town opens with the same jobs.

**Rules.** Replace, never layer: the old import is deleted in the same change, and the old workplace table is moved, not copied. One rule, all 56 places: the workplace table is data keyed by kind of work, with no place named. Build only what the golden path needs, and write fresh where that is simpler than carrying old code over.

**Done when.** In a drawn place from all 56 (name and seed in the PR body) `opening-employment.ts` imports nothing from `src/simulation`, the same town opens by record id (a fingerprint of the job rows, their employers and their holders equal before and after, via `buildBenchWorld`), `grep -n 'from "../simulation' src/core2/opening-employment.ts` prints nothing, and the file's tests pass; the PR counts the old lines removed.

**Files.** src/core2/opening-employment.ts, src/core2/data/opening-employment/, src/core2/population.ts

**Notes.** Written Oct 18 from the file's imports (it was a placeholder). Part of the opening town builder port; see core-port-world-scaffold and core-old-imports-14 (done, Oct 16 note) for the family. core-old-imports-opening-work follows this one because the schedules need each job's workplace. Reconciled Oct 23: the organization-profile read (#5543) and the jail-term read (#5073) are already on main, so the remaining old imports in the file are the workplace tables and `townWorkplaceFor` from `simulation/living-world/town-employment`, its generated meta, and old World types.

Sent back 2026-10-22 from PR #5071 (branch claude/old-imports-opening-employment): The new jail-term specification is stale against main: docs/pool/items/core-old-imports-opening-employment-jail-term.md:16 says opening-employment still calls old jailTermOn and :20 requires a serving prisoner at the opening. PR #5073 is already merged, that import is gone, and current opening-employment.ts:286 explicitly says opening sentences do not yet exist. Reconcile the spec/Notes with that delivered removal rather than assigning a new impossible opening-prisoner proof; preserve main metadata and any genuinely unfinished work. The body also describes the org-profile move as still ahead although main now imports openingOrganizationProfiles from core after #5543. Finally its first-line parent marker would automatically complete core-old-imports-opening-employment, despite this being a planning/specification PR and the town-employment imports still remaining. Use truthful notes-only completion routing and retain the parent acceptance, or finish its linked implementation. No local standard gate pass or opening-employment completion is claimed for this source review.; finish on that branch, merge main into it first.

Split Oct 19. Sub-items: core-old-imports-opening-employment-jail-term (S, new), and from the sibling split core-old-imports-population-org-profile (S) and core-old-imports-population-town-employment (M); the town-employment and org-profile moves serve both population.ts and opening-employment.ts, so whoever builds them deletes both imports. The deeper cause is that the opening builds an old World first; ending that is core-delete-old-engine's last step. Reconciled with main Oct 23: the jail-term slice was delivered by PR #5073 (the import is gone); the org-profile move was delivered by PR #5543 (opening-employment.ts imports openingOrganizationProfiles from core); the town-employment move remains and is the parent's open work, so the parent acceptance stays whole and this PR (planning only) does not complete it.
