---
id: people-filing-and-loss-scenes-for-non-candidates
title: "Listeners tied to a candidate get a filing scene as the candidate, and a race-lost scene as the loser, for races they never entered"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The director staged a filing scene and a race-lost scene around listeners tied to a candidate, as if they had filed or lost a race they never entered, and staged hearing scenes around people who never spoke. A participant scene (a filing, a race lost, a public hearing) must be staged only around a person its cause record names. src/director/scheduling.ts checks the staged person against the record's named people, and the situation types in src/director/data/situation-types.json mark which kinds are participant scenes.

**Rules.** Ask why: each staged participant scene answers why this person, by the cause record that names them. A loser's scene goes only to a named candidate who is not the record's winner. No hand-written player text: only who is staged changes, never the words.

**Done when.** In a played world built with buildBenchWorld in a drawn place (up to 6 draws from all 56, failing with every place and seed tried), src/director/scene-subject-named.test.ts finds at least one filing, one race-lost and one hearing scene. It asserts each kind separately: the filing's person is named by its candidate-filed record, the race-lost person is named by its election-result record and is not its winnerId, and the hearing's person is named by its public-comment record. The PR body names the place, seed and each record id.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/director/scene-subject-named.test.ts, src/director/cause-names.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5056 (branch claude/scene-subject-named): Merge main 355f7abbdb8d into claude/scene-subject-named conflicts in: src/director/data/situation-types.json, src/director/scheduling.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5056 (branch claude/scene-subject-named): Main and the current open parent #5055 are merged and plain-pushed at 624d728ee; only pool conflicts needed resolution. The local gate was not claimed complete. In src/director/scene-subject-named.test.ts:30-43, one shared seen count accepts any of filing, race-lost or public-hearing, so a hearing alone can pass while both of this PRs electoral scene sets are empty. Require positive filing and concession cases (and the parent hearing case separately), retaining the record-person assertion for each. Both docs/release/changes/scene-subject-named.md and hearing-speaker-named.md also declare impact none while changing who is visibly staged; use accurate patch declarations. This remains a fixer into the parent branch, not a main merge or completed pool item.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5056 (branch claude/scene-subject-named): The separate positive filing, race-lost and hearing checks and patch declarations address the earlier return. The pool item still has TODO in What, Rules, Done when and Files, and the body has no Done when evidence table. Write the concrete bounded filing/concession acceptance, then map each named scene/record-person check and drawn-world proof to it in the required table. This remains a fixer based on open parent #5055; no pool item should be completed for that branch merge. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Oct 29 (CTO): #5056 closed because no session carries it (it conflicts with main in src/director/data/situation-types.json); its branch is kept. The words session owns the director, so this is its item to take or drop.
