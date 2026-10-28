---
id: scene-bill-held-sponsor-finds-it-off-the-agenda
title: "A sponsor whose bill a chair held unheard finds it off the agenda, as a scene"
lead: director
area: play
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A committee chair's hold (bill-held-in-committee) now names the bill's sponsor in its people and a sponsorId fact (laws-hold-record-names-the-sponsor), so the sponsor meets it as their own moment, but no situation type stages a scene for them: bill-held-chair and bill-held-member are for the chair and the committee's members. The packet's line 3 (docs/design/scenes/from-life/bill-held-in-committee.md) is the sponsor learning it from the posted agenda, not from the chair. An unheard hold writes no bill-failed record, so words-staff-news-bill-lost does not cover it either.

**Rules.** Wire to the world: the scene fires from the hold record by its id, its sponsor matched by the sponsorId fact, and a reply the sponsor chooses (going to the chair) is a reply the legislature reads. Scene standard: it writes something back.

**Done when.** In a buildBenchWorld drawn place (seed named) whose legislature holds a bill, a test shows the sponsor's staged scene caused by the bill-held-in-committee record id, composed with the bill's number, and a reply in it recorded; the director's reach report shows the type fired from that record.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** TODO
