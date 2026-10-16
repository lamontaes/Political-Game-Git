---
id: gov-counted-reads-campaigns
title: "Campaigns read counted voter groups, not built household records"
area: gov
kind: stopgap
priority: 2
size: M
status: done
claimed-by:
pr: #4735
blocked-on:
source: "split from core-stopgap-counted-groups-faked-mechanic (SG-CORE-counted-person-views), Oct 15"
claimed-at:
---

**What.** `modules/campaigns.ts` walks `rt.households.values()` to canvass and count supporters (near lines 603, 644 and 1797). Read the counted voter groups (by district, age and work) times their counts, and build a household record only for the door a candidate actually knocks on. Today the stand-in builds a person or household record with no past and no ties for every counted member the engine touches. A counted group is read with the same rule as a full person, times its count, so the engine's total must not change.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count, and a filled-in person matches the group's records. Replace, never layer: the engine's use of the built record is deleted in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body) the campaigns engine's totals equal the old per-person totals by group record id, no call of the household view remains in the engine, and the engine's tests and the counted-groups test pass.

**Files.** src/core2/modules/campaigns.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Part of retiring SG-CORE-counted-person-views (src/core2/data/stopgaps.json). place-prices already reads the store's live households and counts directly. Candidacy reaches counted people only through campaigns.

Sent back 2026-10-16 from PR #4735 (branch claude/gov-counted-reads-campaigns): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4735 (branch claude/gov-counted-reads-campaigns): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
