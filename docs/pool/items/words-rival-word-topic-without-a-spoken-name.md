---
id: words-rival-word-topic-without-a-spoken-name
title: "A rival's message about a budget line with no spoken name skips the whole scene"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: director-rival-word-placed-by-its-record
source: Scan of drawn places for #9416 (Prospect TN rwscan:0, Highland Heights KY rwscan:3), Nov 15
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** At Prospect TN a night of doors by a rival arguing against `budget-line:localAid` was staged three times and skipped each time ("the tell that states rival-word cannot be worded from the records given"): the player gets no scene and no journal line for that message. Highland Heights KY skips a moved-none message the same way.
Seen: Prospect TN, seed rwscan:0 (key 4760800), three rows in one season.

**Cause.** Found in code: `purposeScene` (src/director/purpose-scene.ts) sets the `issue` fact from `questionSaid(record.topic)`, and `questionSaid` (src/english/question-names.ts) reads data/english/question-names.json, which holds ten budget lines (police, corrections, schools, higherEducation, parks, naturalResources, housing, healthAndHospitals, welfareAndMedicaid, highways) but not `localAid`; the budget's axes file (src/core2/data/legislature/budget-line-axes.json) lists 27 lines, so up to 17 have no name (which of them a message can pick is part of the fix's first step); with no `issue`, every rival-word opener (which requires it) is out and the scene is skipped.

**Fix.** Add the missing budget-line rows to data/english/question-names.json in the shape of the ten that exist (about, said, to, for, against, today lines), authored by the Words lead, so a rival can campaign on any line the budget has; and a test that every budget-line id the campaigns engine can pick as a message topic has a spoken name.

**Time box.** 3 hours for an Opus session.

**Rules.** Never invent a line the record cannot back: the rows say what the line pays for as the budget screen names it. One engine: the same names file every other scene reads.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed), a rival's news scene about a budget line that had no name before, opened and answered with its spoken name; and the test that every pickable budget line has a name passes.

**Waits on.** director-rival-word-placed-by-its-record (PR #9416).

**Files.** data/english/question-names.json, src/english/question-names.ts, src/core2/modules/campaigns.ts

**Notes.** Filed Nov 15 by hand on the rival-word branch; searched docs/pool/items for rival-word and question-names, no twin.
