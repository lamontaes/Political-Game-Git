---
id: elections-poll-workers
title: "The elections engine records who works each precinct's polling place, and the director stages them"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The director's polling-place visit already carries `pollingPlaceId` and `pollWorkerIds`, but the elections engine records no one who works a precinct's polling place, so no poll worker stands in the scene (stopgap SG-PEOPLE-poll-workers). Have the elections engine record who works each precinct's polling place from the town's residents (a record per precinct and election, naming the people), and have the director stage them. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No hand-written player text (controls and lines come from controls.json and the English engine); an effect is a read; no dice; one rule, all 56 places; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place with an election, the player's polling-place scene names poll workers from the town's records, each traced to the elections engine's polling-place record id. SG-PEOPLE-poll-workers is resolved. A test in src/director/polling-place.test.ts proves it.

**Files.** src/core2/modules/elections.ts, src/director/polling-place.ts, src/director/data/polling-place.json

**Notes.** Split out of gov-needs-opus-gov-165 (line 168 of OPUS-GOV.md). The visit's hook for poll worker ids exists; the record it reads does not.

Sent back 2026-10-16 from PR #4719 (branch claude/poll-workers): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
