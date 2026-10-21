---
id: people-filing-and-loss-scenes-for-non-candidates
title: "Listeners tied to a candidate get a filing scene as the candidate, and a race-lost scene as the loser, for races they never entered"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/scene-subject-named
pr: #5056
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T23:04:32.891Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #5056 (branch claude/scene-subject-named): Merge main 355f7abbdb8d into claude/scene-subject-named conflicts in: src/director/data/situation-types.json, src/director/scheduling.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5056 (branch claude/scene-subject-named): Main and the current open parent #5055 are merged and plain-pushed at 624d728ee; only pool conflicts needed resolution. The local gate was not claimed complete. In src/director/scene-subject-named.test.ts:30-43, one shared seen count accepts any of filing, race-lost or public-hearing, so a hearing alone can pass while both of this PRs electoral scene sets are empty. Require positive filing and concession cases (and the parent hearing case separately), retaining the record-person assertion for each. Both docs/release/changes/scene-subject-named.md and hearing-speaker-named.md also declare impact none while changing who is visibly staged; use accurate patch declarations. This remains a fixer into the parent branch, not a main merge or completed pool item.; finish on that branch, merge main into it first.
