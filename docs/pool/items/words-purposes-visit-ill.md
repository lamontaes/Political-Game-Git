---
id: words-purposes-visit-ill
title: "A visit to someone seriously ill plays a scene with a purpose: the sick person asks the visitor for something, from the illness record"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-visit-ill
pr: pending
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); stopgap SG-WORDS-visit-ill-no-purpose
claimed-at: 2026-11-10T01:30:00.000Z
---

**What.** The `visit` type kept no purpose for its illness cause, so the player visiting someone they know who is seriously ill played generic talk. Using the per-cause purpose added with the news and departure unit, only that cause (`health.serious-illness` where the ill person is the player's counterpart) plays `visit-ill-ask`; the cause where the player is the one ill, and the prison causes, stay as they were. The sick person opens and asks the visitor for something: to look in on the house, to call someone who has not been told, to bring a child, to say honestly how they look, to come back. The facts are read from the health engine's own record and cited by id (`src/director/illness-facts.ts`): how long they have been ill (the record's date, said once it is about two weeks), whether they live alone or with a partner or a child (the household), and another person who heard and could be called (the record's witnesses, the closest). The illness itself is never named, because the record does not say its kind.

**Rules.** No new engine. A fact with no record behind it is left out, so the lines that need it never play. A reply is written by record id; what the player agrees to or promises is kept (a promise) and a no that is pressed strains the tie. No dice.

**Done when.** src/director/visit-ill-scene.test.ts, in worlds drawn from places, begins an adult the player knows falling ill through the health engine, lets the director cast the visit, composes it through the purpose engine with each fact cited to the illness record, household or witnesses, writes a reply that keeps a promise by record id, and shows a month later that the same record says how long they have been ill; the English and families guards pass.

**Files.** src/director/illness-facts.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-visit-ill-no-purpose is narrowed to what it still covers (the visit when the player is the one held or ill); new SG-WORDS-visit-ill-ask-unrecorded and SG-WORDS-visit-ill-promise-unread. The illness is begun by the test through the health engine (hand-staged trigger); everything after is the engines'. Voice read: guidance and a forum thread on hospital visits (let the patient lead, keep it short, give permission to be honest).
