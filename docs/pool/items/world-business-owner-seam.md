---
id: world-business-owner-seam
title: "Finish #4338: business owners' decisions with the core-to-module seam inverted"
area: world
kind: wiring
priority: 1
status: open
claimed-by:
pr: #4338
blocked-on:
milestone:
source: "reissue item 7; PR #4338 branch pool/business-owner-decisions"
---

**What.** The core (choice.ts) must not import modules/residents; the residents module registers a callback (or the chooser reads api.accounts) so the counted owner's fund is reached without the core depending on a module. Merge main (keep #4340's savings withdrawal in closeByChoice and this PR's counted-owner fund, in that order).

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** No core import of a module; a counted owner's business decision cites their fund in a drawn year.

**Files.** src/core2/choice.ts, modules/residents.ts

**Notes.** None.
Sent back 2026-10-15 from PR #4338 (branch pool/business-owner-decisions): code conflict with main in src/core2/modules/business.ts, src/core2/business.test.ts, stopgaps.json; finish on that branch, merge main into it first.
