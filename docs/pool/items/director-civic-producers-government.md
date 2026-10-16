---
id: director-civic-producers-government
title: "Bill signing, veto, hearings, floor votes, recalls, scandals, appointments and a law reaching a person fire as scenes"
area: director
kind: wiring
priority: 1
size: M
status: in-pr
claimed-by:
pr: #4600
blocked-on:
after: director-civic-roles
source: "director-civic-producers, found building it"
claimed-at:
---

**What.** Bill signing, veto, hearings, floor votes, recalls, scandals, appointments and a law reaching a person fire as scenes. The core writes events or decisions for each (the legislature's sign-or-veto and hold-hearing decisions, `recall-petition`, `press.exposed`, `economy.board-appointment`, `law.effect-learned`), but the director has no moment for them and marks their types as waiting on a producer. Give each a moment for the person it reaches, drop the mark, and bind the roles from records.

**Rules.** No dice: a scene fires from a recorded cause, never a roll, and a quiet day fires nothing. The chain is the acceptance: each fired scene is traced from its cause record to the scene to the journal line. One rule, all 56 places: a random place and seed from all 56, named. Speed: the ledger acts on the day a record is written, never by scanning the world each day.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a player who sits on a body sees a floor-vote scene and a bill-signing scene, each traced to its record id, and the reach report (src/director/reach.ts) lists these types as fired or names a real reason in that year. Tests in src/director/director.test.ts and office-scene.test.ts prove it. The owner plays it: he signs a bill and the signing scene opens.

**Files.** src/director/ledger.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/core2/modules/legislature.ts

**Notes.** Needs director-civic-roles for the chair, members and press. Some of these records are decisions, not events, so the legislature may need to emit an event first, which belongs to the government area. Split out of director-civic-producers.

Sent back 2026-10-16 from PR #4600 (branch claude/director-civic-producers-government): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
