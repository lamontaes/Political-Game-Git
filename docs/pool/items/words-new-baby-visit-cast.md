---
id: words-new-baby-visit-cast
title: "A new-baby visit plays as a scene with a purpose: only for a parent, visited by kin who are not the baby's own parents, with the child's name from the birth record"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: story/scenes-next
pr: #8082
blocked-on:
lead: words
source: CTO brief, Nov 9 (batch 4 saw generic talk at a new baby); one drawn year of Ophir, Colorado (seed nx1) tallied by scene kind
claimed-at: 2026-11-09T23:30:00.000Z
---

**What.** Counting the scenes the player's book staged in one drawn year (Ophir, Colorado, seed nx1), the new-baby type was cast 4 times and every one was skipped by the purpose engine ("no narration for new-baby can be worded from the records given"), so the scene fell back to generic talk. Three causes. (1) Nothing wrote the `kid` fact the lines name the baby with; `birth-facts.ts` now reads it from the `person-birth` record (child, other parent, the visitor's town when it is not the parent's). (2) The birth cause matched every birth in town and cast the watched person as "parent", so the player was cast as the parent of three strangers' babies and of a sibling in the home; the two causes now require the record's `motherId` or `otherParentId` to be the watched person. (3) The visitor was filled from "kin", whose closest member is the other parent, so the baby's father came to "meet" his own child with groceries; a new fill, `kin-visiting` (scheduling.ts), takes kin the cause record does not name. 14 new lines use the new facts and the research on newborn visits (ask how they are, offer a chore or an hour of sleep, ask before holding, give no advice).

**Rules.** No new engine. A fact with no record behind it is left out. No dice.

**Done when.** src/director/new-baby-scene.test.ts, in worlds drawn from places, plays a year with everyone watched; every parent's new-baby moment composes through the purpose engine with the child's name cited to the birth record, the visitor is never the baby or a parent, and no moment is cast around a non-parent; src/director/birth-scenes.test.ts still passes; the Ophir year tally shows the 4 skips gone.

**Files.** src/director/birth-facts.ts, src/director/purpose-scene.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgap: SG-WORDS-new-baby-ask-unrecorded. Found in the same tally and not fixed (casting, the Director helper's): `recall` fires 9 times in that year with the player cast as the petitioner of a recall outcome they are not part of (the lines need a bill the misconduct petitions lack); `bill-signed` (3) and `veto` (1) skip for want of narration; `address` (5) has no purpose by design (the speech engine reads it). #7909 (news-arrives, departure) does not cover new-baby; `news-arrives`, `departure`, `visit`, `hearing`, `verdict` and the two sittings still have no purpose and did not fire in this year.
