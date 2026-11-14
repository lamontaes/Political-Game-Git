---
id: scene-hearing-witness-after-the-hearing
title: "A witness catches you after the hearing on your bill and says what it does to them"
area: words
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/project-thread-lcf812
pr:
claimed-at: 2026-11-14T08:10:00.000Z
after:
blocked-on:
lead: words
source: 'owner, Nov 14, 2026, 06:23Z ("a ton for legislating and negotiating, because there''s so much that has to go on with each bill"); brief V, stages of a bill; Words lead''s ruling in held/bill-stages.md'
model: opus
effort: medium
root: rc6-scenes-repeat
---

**What.** When a state or territory committee hears a bill the player sponsors or sits on, one of the residents who testified catches them in the hallway and says what the bill does to their own life (their job, their rent or house, a child at home, their own age, or only what they believe), worded by their bearing and never with a figure. The player can thank them, ask what it would really mean, tell them they see it differently, or brush them off; each reply is time on their tie, and disagreeing or brushing them off cools it, which the witness's own vote reads. Seen: a scene in the capitol hallway the day of the hearing on the player's bill.

**Cause.** Design: docs/design/story-director.md. The legislature's committee-hearing record (src/core2/modules/legislature.ts, `committeeStage`) named witnesses only as "for" or "against" (and a raw hourly wage for the wage witness), and no circumstance row staged anything from it for a player named in it.

**Fix.** Witnesses carry what the bill reaches in their life (`witnessLife` in src/core2/modules/interest-groups.ts, from their employer, lease or mortgage, a child at home, their age); the hearing record's facts list them; an against-witness now argues against the bill. A circumstance row `hearing-witness` casts one of them for a player named in the record; the `witness-stake` arc gives four replies and two turns past the opening; the lines are bank pieces.

**Time box.** 6 hours for one Opus session.

**Rules.** No figures in talk (rule 101); no "for" or "against" said as a label (rule 103); plain American English, no office jargon (rule 107). Towns and counties have no hearings and get no scene (Words lead). No new stopgaps.

**Done when.** A second session plays a state legislator in a drawn place, drafts a bill the chamber can pass and gets it heard, and on the hearing day sees a witness from the hearing's list catch them in the hallway, say what the bill does to their own life without a number, and answer each of the four replies; after a disagreeing reply, dev mode shows the tie with that witness changed that day.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/interest-groups.ts, src/director/circumstance.ts, src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, src/bench/data/scene-places.json, data/english/parts/scene-talk.json, src/director/hearing-witness.test.ts (new)
