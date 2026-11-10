---
id: scene-bill-held-sponsor-finds-it-off-the-agenda
title: "A sponsor whose bill a chair held unheard finds it off the agenda, as a scene"
lead: director
area: play
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
model: sonnet
effort: medium
root: design-story-director
checked: fable 2026-11-10
---

**What.** Once a committee chair's hold (bill-held-in-committee) names the bill's sponsor in its people and a sponsorId fact (the open item laws-hold-record-names-the-sponsor), the sponsor should meet it as their own moment. No situation type stages a scene for them: bill-held-chair and bill-held-member cast the sponsor as the asker toward a chair or member who is the player, never the sponsor as the player. The packet's line 3 (docs/design/scenes/from-life/bill-held-in-committee.md) is the sponsor learning it from the posted agenda, not from the chair. An unheard hold writes no bill-failed record, so words-staff-news-bill-lost does not cover it either. Seen: a scene in which the player, as sponsor, finds a held bill off the agenda (the golden path's propose-an-ordinance step).

**Cause.** Found in code: src/core2/modules/legislature.ts, in the committee stage that emits kind bill-held-in-committee (line 4409), lists only the committee's members and witnesses in personIds and carries billId, level, committee, chair, yes and no, with no sponsor. The types bill-held-chair and bill-held-member in src/director/data/situation-types.json bind the player as the chair or member and the sponsor as asker, and none binds the player as the sponsor. src/director/hold-scenes.test.ts proves only those two.

**Fix.** After laws-hold-record-names-the-sponsor lands, add a situation type to src/director/data/situation-types.json (arc in src/director/data/purpose-arcs.json) that casts the sponsor as the player from the hold record's sponsorId, with a reply the legislature reads (going to the chair), and extend src/director/hold-scenes.test.ts so it fails when a hold stages nothing for the sponsor.

**Time box.** 3 hours.

**Rules.** Wire to the world: the scene fires from the hold record by its id, its sponsor matched by the sponsorId fact, and a reply the sponsor chooses (going to the chair) is a reply the legislature reads. Scene standard: it writes something back.

**Done when.** A second session, in a buildBenchWorld drawn place (seed named) whose legislature holds a bill, sees the sponsor's staged scene caused by the bill-held-in-committee record id, composed with the bill's number, and a reply in it recorded. The director's reach report shows the type fired from that record, and the test in src/director/hold-scenes.test.ts fails when the sponsor's scene is missing.

**Waits on.** laws-hold-record-names-the-sponsor (open).

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, src/director/hold-scenes.test.ts, src/core2/modules/legislature.ts

**Notes.** TODO
