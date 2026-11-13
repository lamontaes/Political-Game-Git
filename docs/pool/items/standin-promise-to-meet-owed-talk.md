---
id: standin-promise-to-meet-owed-talk
title: "A promise to meet, visit or call that a player makes in a first meeting, reunion, letter, celebration or missed gathering brings the two together on the day"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after: people-owed-talk-record
blocked-on:
source: stand-in triage Nov 10
lead: effects
standard: 2
model: sonnet
effort: medium
root: design-life-record
---

**What.** Stand-ins SG-WORDS-meeting-promise-unread, SG-WORDS-reunion-letter-promise-unread and SG-WORDS-celebration-gathering-promise-unread. When the player promises to show a newcomer around, meet again, visit, write back, call or make a toast, the promise is written on the scene reply and nothing happens: no meeting, no call, no visit, and a kept or broken promise changes no tie. Seen: in the talk that happens on the day the player promised.

**Cause.** Found in code: src/director/purpose-scene.ts replyInScene (around line 1805) writes owedWith, owedTopic and owedDueOn only for a family-stake put-off; src/core2/modules/people.ts, kin-contact.ts and partnerships.ts read no promise from a scene.reply on the first-meeting, reunion, letter, celebration or gathering types (kin-contact.ts writes only the monthly contact hours).

**Fix.** Extend the owed-talk record of people-owed-talk-record (do not add a second table): when a reply to a first-meeting, reunion, letter, celebration or gathering scene keeps a promise, write the owed record with the person it is owed to, the topic taken from the scene type and the due day. On the due day the people engine books the two together if both are in town (or adds a kin contact if the person lives elsewhere), and closeness rises when the time together happened and falls when the day passed with none. Resolve the three stand-ins in src/director/data/stopgaps.json. Cost: the record is written on a reply (rare) and read from the module calendar on its due day, never scanned daily.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the people engine and the tie read the owed record. No dice: whether the day is kept follows recorded time together and the two people's places, never a chance. One rule, all 56 places. Replace, never layer: the three promise stand-ins are deleted, not kept beside the new read.

**Done when.** A second session plays a year in a drawn place (buildBenchWorld, place and seed named), answers a reunion or letter scene with a promise to visit, and finds the owed record by id naming the person, the topic and the due day, then finds on that day either time together recorded on the tie (closeness up) or none (closeness down), with the three stand-ins resolved.

**Waits on.** people-owed-talk-record (open).

**Files.** src/director/purpose-scene.ts, src/core2/modules/people.ts, src/core2/modules/kin-contact.ts, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json
