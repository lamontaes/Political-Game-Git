---
id: director-scene-dropped-when-its-cause-no-longer-stands
title: "A scheduled scene is dropped when the engine row that caused it no longer stands"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-story-director
source: added with npm run pool -- add
---

**What.** A scene the director has already scheduled from a record is still offered after the engine has changed the thing the record was about. First case: a committee hold (bill-held-in-committee) is followed by a scheduled 'press the chair' scene for a member; if the chair then agrees in the sponsor's scene and the bill is re-listed (#8972), the member's scene is still offered for a hold that no longer stands. Seen: no member is asked to press the chair about a bill that was re-listed after the chair agreed.

**Cause.** Found in code: causeMatches in src/director/scheduling.ts (around line 385) reads only the cause event's own facts from the durable log, which never change; nothing rechecks the engine row behind the event (here the committees row, removed and replaced on a re-list in src/core2/modules/legislature.ts reopenHeldBill). Reported by the laws-hold-record-names-the-sponsor builder.

**Fix.** Let a situation type's cause name the engine row it depends on (for bill-held-member: the committee row the hold's id names, still held) and have the scheduler drop a scheduled moment whose row is gone or changed when the scene is about to be offered; use it for bill-held-member first and add one assertion that after a re-list no bill-held scene for that hold is offered.

**Time box.** 3 hours

**Rules.** Director and English files belong to the Words and director owner (Review: words). No dice. One engine: reuse causeMatches, add no second scheduler. One rule, all 56 places.

**Done when.** A second session draws a place with a held bill, re-lists it through the chair's agreed scene reply, and sees no bill-held-member or bill-held-chair scene offered for that hold; a test in src/director/hold-scenes.test.ts shows it in a drawn place with its seed named.

**Waits on.** Waits on the pull request that makes a held bill re-listable (#8972) reaching main.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/director/hold-scenes.test.ts
