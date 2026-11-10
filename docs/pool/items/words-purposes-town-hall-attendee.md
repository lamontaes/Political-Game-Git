---
id: words-purposes-town-hall-attendee
title: "A player in the crowd at another official's town hall gets a scene with a purpose: a neighbor who is there asks whether to stand up, whether the answer meant anything, whether the player will speak or come again"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-town-hall-attendee
pr: 8120
blocked-on:
lead: words
source: Director helper finding in #8109 (a town hall is a moment for each attendee, but only the host's town-hall-question plays)
claimed-at: 2026-11-10T09:00:00.000Z
---

**What.** A town hall's record lists the host first, then the attendees, and names the host in `facts.hostId`. The new type `town-hall-attendee` fires for an attendee who is not the host: a person they know who was also in the room (a new fill, `town-hall-neighbors`, read from the record's people and the subject's known people, closest first) asks them something under the purpose `town-hall-neighbor`. The facts are read from the meetings engine's town-hall row: the host, the question the room took (the issue), the bill the hall was called for, whether the host answered that question, and whether the neighbor stood up.

**Rules.** No new engine; the existing meetings record, the existing purpose engine. The narrator says only what the record shows. A reply is written by record id; a promise is kept and a pressed no strains the tie. No dice.

**Done when.** src/director/town-hall-attendee-scene.test.ts, in worlds drawn from places, has an official hold a town hall the player attends, lets the director cast the neighbor, composes the scene through the purpose engine with each fact cited to the hall's records, and writes a reply that keeps a promise by record id; the English and families guards pass.

**Files.** src/director/civic-roles.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: new SG-WORDS-town-hall-attendee-unrecorded and SG-WORDS-town-hall-attendee-promise-unread. Voice read: town hall advice from attendees and advocacy guides (most people hold back from the first question; bring a second question in case someone asks yours; keep it short; talk to a neighbor who shares your view).
