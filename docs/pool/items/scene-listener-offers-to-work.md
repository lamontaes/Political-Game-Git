---
id: scene-listener-offers-to-work
title: "After a speech one listener stays behind and offers to work, or a veteran volunteer says the others are drifting"
area: director
kind: feature
priority: 1
size: M
status: done
claimed-by:
pr: #6314
blocked-on:
source: "Helper B, Oct 27, docs/design/scenes/from-life/quiet-weeks-listener-offers.md"
lead: director
claimed-at:
---

**What.** Trigger: speech.heard (written by speech.ts for each speech, real id speech:person_10cfb41e518dc9ce:2025-11-07:speech:organization_e69498ee05dc2bd0 in Kanorado, Kansas). Place: the venue after the speech, or the campaign office. Cast: one listener from the speech's listener rows, scored by tie, free time and agreement, one scene per speech at most; the veteran version casts an existing volunteer when a lapse record exists. Outcome: the reply writes a volunteer-offered record and, on a yes, calls enlistVolunteer; the canvass, turnout and the next scene read it. Lines for the words lead are in the packet. A filed candidate had 6 scenes in 102 schedule entries from May to September; the director's pacing should let these through.

**Rules.** Cast from the world: the listener is on the speech's own rows, never invented. No dice: the answer follows the listener's recorded reasons. Replace never layer: nothing here replaces an old scene, but the silent volunteer-joins in askToVolunteer's callers get a record.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a candidate's speech fires the listener scene with the listener and speech named by record id, the reply writes a record and a volunteer enlistment the campaign reads, a test fails when the speech record is absent, and bench screenshots at 1440x900.

**Time box.** 4 hours.

**Files.** src/director/data/situation-types.json, src/director/purpose-scene.ts, src/core2/modules/campaigns.ts, data/english/parts/scene-talk.json

**Notes.** Does not wait on campaigns-volunteer-joined-and-lapsed-records for the first version (enlistVolunteer exists); the veteran version does. Lines in docs/design/scenes/from-life/quiet-weeks-listener-offers.md.
