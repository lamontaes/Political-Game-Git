---
id: world-appointment-names-the-appointer
title: "An appointment is recorded naming the executive who made it, so the appointer meets the person next in line"
area: world
kind: feature
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-world-appointment-names-the-appointer
pr: #8509
blocked-on:
after:
model: sonnet
effort: medium
root: design-director-on-core2
source: words-and-scenes helper D, Oct 27; probe of a mayor's played year in Woodway, Texas
lead: m0-m2
claimed-at: 2026-11-11T02:59:12.250Z
checked: fable 2026-11-10
branch: claude/pool-world-appointment-names-the-appointer
---

**What.** The official-appointed record names only the person appointed in personIds; the appointer is a fact (appointedBy) and no one's record. In Woodway, Texas a mayor's year held a replacement city attorney named on January 15, 2026, and the mayor's moments held nothing from it, so no scene could bring the person who was next in line, or the one who wanted the post, to the mayor who chose. Name the appointer in personIds when a town post or a cabinet post is filled, and keep the ranked candidates the appointer weighed in the record's facts (reasons already rank them in the appointment row). Add the director moment that the appointer then has. Seen: the scene where the mayor meets the person next in line for a post the mayor fills.

**Cause.** Found in code: src/core2/modules/executive.ts (the api.emit of kind official-appointed, line 584) writes personIds: [row.holderId]; the appointer appears only as facts.appointedBy (line 591). Evidence is in docs/design/scenes/from-life/executive-record-gaps.md.

**Fix.** Add the appointer to personIds and the ranked candidates to facts when a town or cabinet post is filled, and add the director moment for the appointer in src/director/data/director.json.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the appointer's record is read by the director, which stages a scene with the runner-up in the room. No dice: who is next in line is the appointer's own recorded ranking (appointer reasons), never a roll. One rule, all 56 places: the change names no place and the check draws one.

**Done when.** A second session (not the builder) plays a world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose, through a year in which a town or cabinet post is filled, and sees the official-appointed record with the appointer and the appointee in personIds and the appointer holding a moment from it in the director's ledger; a test lists the records of the year and fails when the appointer is absent from any.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts, src/director/data/director.json, docs/design/scenes/from-life/executive-record-gaps.md

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md. The scene it unblocks is the next episode, the person next in line. Lead m0-m2 (offices). Words does not build engine records.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:59 UTC) on branch claude/pool-world-appointment-names-the-appointer.
