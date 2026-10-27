---
id: world-department-head-vacancy-is-recorded
title: "A department head's death or move is recorded for the executive who appointed them, so a vacancy can be a scene"
area: world
kind: feature
priority: 3
size: S
status: open
claimed-by: 
pr:
blocked-on:
source: words-and-scenes helper D, Oct 27; code read of the executive review
lead: m0-m2
claimed-at: 
---

**What.** When a department head dies or moves out of town, the executive's regular review fills the post silently for any executive but the player, and for the player the vacancy is only an offer on the office screen. No record names the executive and the departed head, so no scene can bring the deputy, or the person who wanted the job, to the executive who must choose. Record a vacancy when the review finds a head gone, naming the appointer and the departed head, and fill it only after the record is written.

**Rules.** Wire to the world: the vacancy is read by the director and by the office screen's offer. No dice: a vacancy is the departed head's recorded death or move, nothing else. One rule, all 56 places: no place is named.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a head who dies or moves away is followed by a vacancy record naming the appointer, before any replacement is appointed, and the director holds a moment from it for the appointer; a test fails when the replacement is appointed with no vacancy record.

**Files.** src/core2/modules/executive.ts, src/director/data/director.json

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md. Lead m0-m2.
