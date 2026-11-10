---
id: words-purposes-visited-ill
title: "When the player is seriously ill, a relative's visit plays a scene with a purpose: they offer something or ask whether to tell someone, from the illness record"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-visited-ill
pr: pending
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); stopgap SG-WORDS-visit-ill-no-purpose
claimed-at: 2026-11-10T02:30:00.000Z
---

**What.** The `visit` cause where the player is the one seriously ill (`health.serious-illness`, no counterpart; a relative comes to the player) played generic talk. It now plays `visited-ill-ask`: the visitor, the closest kin the player's ties name, offers something (dinner, taking a child, a ride to an appointment, staying the night, coming by) or asks whether to tell someone (the employer, a relative who heard). The player answers yes, promises to say when it is too much, asks what is easiest, or declines. The facts are read from the same illness record, the household, the job row and the witnesses, cited by id, in `src/director/illness-facts.ts`: that the player is ill, how long (said once it is about two weeks), whether they live alone or with a child, whether the visitor is their partner, their employer and another person who heard. The illness itself is never named. A cause may now also name its own `asker` and `asked`, and the cause is chosen by the moment's label and its count of counterparts (two causes share a label), so the player's own illness and a visit to someone else's no longer take each other's purpose.

**Rules.** No new engine. The narrator says only what the records show. A reply is written by record id; what the player agrees to or promises is kept (a promise) and a no that is pressed strains the tie. No dice.

**Done when.** src/director/visited-ill-scene.test.ts, in worlds drawn from places, begins the player's illness through the health engine, lets the director cast the visit, composes it through the purpose engine with each fact cited to its records, writes a reply that keeps a promise by record id, and shows a month later that the record says how long they have been ill; the English and families guards pass.

**Files.** src/director/illness-facts.ts, src/director/purpose-scene.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-visit-ill-no-purpose is narrowed to the visit to the player when held; new SG-WORDS-visited-ill-offer-unrecorded and SG-WORDS-visited-ill-promise-unread. The illness is begun by the test through the health engine (hand-staged trigger). Voice read: first-person accounts of what helped when sick (a specific offer beats "let me know", sit with them, keep contact low-pressure).
