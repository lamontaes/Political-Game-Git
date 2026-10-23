---
id: core-old-imports-opening-employment
title: "The opening's employment allocation comes from the core, not the old town-employment, life-queries and jail-terms code"
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

**What.** The opening's employment allocation still imports the old town-employment, life-queries and jail-terms code. Port only what the allocation uses into the core and read the core's own copies. Delete the old imports from the opening files in the same change, so nothing is left layered beside the new reads.

**Rules.** Replace, never layer: the old import is deleted in the same change that adds the core's read, and the PR body counts what was removed. One rule, all 56 places: the allocation reads place facts from data and never names a place.

**Done when.** For a drawn place and a seed the builder did not choose, the opening built by `buildBenchWorld` allocates the same jobs by record id before and after, `opening-employment-provenance.test.ts` passes, and a search shows no import of the old town-employment, life-queries or jail-terms modules in the opening files.

**Files.** src/core2/opening-employment.ts, src/core2/opening-employment-provenance.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

Sent back 2026-10-22 from PR #5071 (branch claude/old-imports-opening-employment): The new jail-term specification is stale against main: docs/pool/items/core-old-imports-opening-employment-jail-term.md:16 says opening-employment still calls old jailTermOn and :20 requires a serving prisoner at the opening. PR #5073 is already merged, that import is gone, and current opening-employment.ts:286 explicitly says opening sentences do not yet exist. Reconcile the spec/Notes with that delivered removal rather than assigning a new impossible opening-prisoner proof; preserve main metadata and any genuinely unfinished work. The body also describes the org-profile move as still ahead although main now imports openingOrganizationProfiles from core after #5543. Finally its first-line parent marker would automatically complete core-old-imports-opening-employment, despite this being a planning/specification PR and the town-employment imports still remaining. Use truthful notes-only completion routing and retain the parent acceptance, or finish its linked implementation. No local standard gate pass or opening-employment completion is claimed for this source review.; finish on that branch, merge main into it first.
