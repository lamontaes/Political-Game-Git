---
id: scene-appointment-next-in-line
title: "After an appointment, the second-ranked candidate comes to the executive who chose, as a scene"
area: words
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by: 
pr:
blocked-on:
source: scene researcher Helper D, Oct 27; scenes-from-life episode appointment-next-in-line (owner's executive brief: an appointment to make and the person who wanted it)
lead: director
claimed-at: 
after:
model: sonnet
effort: medium
root: design-story-director
---

**What.** When the executive makes an appointment, the person ranked second among the five the executive weighed comes to them the day it is recorded and asks how it came out. The executive answers one of four ways: tell the reason, offer the next post, close the door, or ask what the visitor would have done. The scene says only that the visitor was weighed, since the records rank who was weighed and hold no application. The packet and drafted lines are on main; no situation type exists for the passed-over visit.

**Cause.** Design: docs/design/scenes/from-life/appointment-next-in-line.md (packet, trigger official-appointed, cast rule reasons[1]) under docs/design/story-director.md. src/director/data/situation-types.json has an appointment type for the appointee and the appointer, and none for the second-ranked candidate.

**Fix.** Add a situation type to src/director/data/situation-types.json, with its arc in src/director/data/purpose-arcs.json, caused by the official-appointed record and cast from the appointment row's second-ranked candidate (a living full person who is not the appointee or the executive), with four reply moves, writing scene.reply, the tie contact and a passed-over record back. The lines are written by Story under the Nov 10 split of words work; this item wires the type, the cast and the tests, and registers a stopgap for any line it must stand in.

**Time box.** 4 hours.

**Rules.** No dice: who comes is the second-ranked candidate in the appointment row's recorded reasons, and what they say follows their traits and their tie to the executive, never a roll. Wire to the world: the appointment row, its qualification records and the tie are read by the director, and the scene cites each by record id. No hand-written player text in code: every word is a bank piece worded by the English engine.

**Done when.** A second session, in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, sees an appointment recorded naming its appointer cast the second-ranked candidate as the visitor, and the scene composed citing the appointment row and the cause record by id. A town with fewer than two reasons, or a runner-up who is not a full person, fires none; two trait profiles of the visitor say it differently; the four replies are four moves; a test fails when the appointer is missing from the record.

**Waits on.** world-appointment-names-the-appointer (open), which adds the appointer to the appointment record.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/civic-roles.ts, data/english/parts/scene-talk.json, docs/design/scenes/from-life/appointment-next-in-line.md

**Notes.** Packet: docs/design/scenes/from-life/appointment-next-in-line.md. Trigger record kind: official-appointed (the engine item world-appointment-names-the-appointer adds the appointer to personIds). Place kind: the executive's office, else the phone, the day the appointment is recorded. Cast rule: the visitor is the second-ranked candidate in the appointment row's reasons (appointmentsIn, reasons[1] by total), a living full person who is not the appointee and not the executive; if the row has fewer than two reasons, or the runner-up is not a full person, no scene. Outcome write: scene.reply plus the tie contact between the two (existing); proposed kept record passed-over:<post>:<person> for the engines to read. Facts the lines need, each from a record: name (the runner-up), appointee (name), post (the title, lowercased), years (whole years from the qualification records, two or more), qualified-more (the runner-up's qualification is above the appointee's), appointee-closer (the appointee's alignment plus acquaintance is above the runner-up's). The scene never says the runner-up wanted the post: reasons rank who was weighed, not who applied.

Lines (scene-standard rule 4: by the visitor's top trait and their tie to the player; four replies are four stances).
Narration (any): "{name} was one of the five you weighed for the {post}'s job, and has come to hear it from you." / "The {post} is named. {name} waited until the corridor was empty."
Open, by tie: friend: "I would rather hear it from you than read it." / none: "Have you got a minute about the {post}?" / rival: "So it's {appointee}. I would like to know why."
State, by top trait: deliberate and reliable: "I am told you weighed me for the {post}. I would like to understand how it came out." / warm and agreeable: "I know the {post} went to {appointee}. I will work with them. I would like to ask what I would have needed." / hostile and argumentative with qualified-more and years: "{appointee} got the {post}. I have {years} years in this field. Tell me what counted for more." / persistent: "The {post} went to {appointee}. Tell me what I would need to show you for the next one."
Replies (four stances): tell the reason, with appointee-closer: "It was close. {appointee} was the one I trusted to carry it out." / with qualified-more: "You had the record. {appointee} had the trust, and I needed both." / offer the next: "There will be another post. I want you in mind for it." / close the door: "It is decided. I need everyone I weighed behind it." / ask them: "What would you have done in the {post}'s chair?"
Follow, by trait: warm: "Thank you for telling me yourself." / reserved: "Then I will wait to see how it goes." / hostile: "I will remember that you said it to my face." / persistent: "Then I will be in front of you again when the next one opens."
Close: "I will keep doing my job." / "You will see me at the next one." / "That is all I came to ask."
(Lines are drafts to the standard for the director engineer and the words lead to word through the English engine; the pieces in the reference scenes #6250 and #6233 show the bank shape.)
