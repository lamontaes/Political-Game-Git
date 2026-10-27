---
id: world-appointment-names-the-appointer
title: "An appointment is recorded naming the executive who made it, so the appointer meets the person next in line"
area: world
kind: feature
priority: 2
size: S
status: open
claimed-by: 
pr:
blocked-on:
source: words-and-scenes helper D, Oct 27; probe of a mayor's played year in Woodway, Texas
lead: m0-m2
claimed-at: 
---

**What.** The official-appointed record names only the person appointed in personIds; the appointer is a fact (appointedBy) and no one's record. In Woodway, Texas a mayor's year held a replacement city attorney named on January 15, 2026, and the mayor's moments held nothing from it, so no scene could bring the person who was next in line, or the one who wanted the post, to the mayor who chose. Name the appointer in personIds when a town post or a cabinet post is filled, and keep the ranked candidates the appointer weighed in the record's facts (reasons already rank them in the appointment row).

**Rules.** Wire to the world: the appointer's record is read by the director, which stages a scene with the runner-up in the room. No dice: who is next in line is the appointer's own recorded ranking (appointer reasons), never a roll. One rule, all 56 places: the change names no place and the check draws one.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a year in which a town or cabinet post is filled shows the official-appointed record with the appointer and the appointee in personIds, and the appointer has a moment from it in the director's ledger; a test lists the records of the year and fails when the appointer is absent from any.

**Files.** src/core2/modules/executive.ts, src/director/data/director.json

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md. The scene it unblocks is the next episode, the person next in line. Lead m0-m2 (offices). Words does not build engine records.
