---
id: standin-action-confront-own-purpose
title: "A protest or strike that stands before an official is worded as its own scene, not as a town hall"
area: director
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: opus
effort: medium
root: rc4-hand-written-words
---

**What.** When a protest or strike confronts a town official (situation type action-confront) the exchange borrows the town hall's purpose: the narration and the protester's opening are the protest's own, but the official's replies and the endings are the town hall's and say nothing about a crowd or a picket line. Stand-in SG-WORDS-action-confront-town-hall-lines. Seen: in the scene text when a protest or strike stands before an official.

**Cause.** Found in code: src/director/purpose-scene.ts line 734 (marker) sets the fact `host-declined` so the protest reads as a town hall whose host declined to answer; src/director/data/purpose-arcs.json has no purpose of its own for action-confront. Owner, Nov 8: the English works differently for different kinds of scenes.

**Fix.** Add a purpose for action-confront in src/director/data/purpose-arcs.json whose official's replies and endings are stances toward the crowd (hear the line, send a representative, call the police, join them), each ending writing through an existing engine (the public-action module's action record and the relationship record, as the town hall's endings do), and write the bank pieces under the civic-prose skill with the words engine's grading; then delete the `host-declined` borrowing at purpose-scene.ts line 734 and clear the stopgap. The words are a bank, never typed in code.

**Time box.** 6 hours for one Opus session.

**Rules.** scene-standard: a scene writes something back, so each ending names the record it writes. civic-prose for every bank piece. Replace, never layer: the borrowed fact is deleted in the same change. One rule, all 56 places.

**Done when.** A second session plays buildBenchWorld in a drawn place (place and seed named) until a protest or strike confronts an official, opens the scene and sees an official's reply that mentions the crowd or the walkout, and an ending that has a record id; the town hall scene itself is unchanged in a place with none.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/core2/modules/public-action.ts, src/director/data/stopgaps.json
