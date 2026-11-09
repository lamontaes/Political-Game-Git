---
id: words-purposes-return-visit
title: "A homecoming from prison and a visit to someone the justice engine holds each play a scene with a purpose, from the sentence and release records"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-return-reunion
pr: pending
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one")
claimed-at: 2026-11-09T14:00:00.000Z
---

**What.** The `return` scene (someone home from prison) and the visit to someone the justice engine holds had no purpose, so they played small talk. `return` now has the purpose `homecoming`: the person home asks for a place to stay until there is work, for help finding work with a record, and to know where they stand after the term (or, when the player is the one home, a relative asks what happens now). A new type `prison-visit` takes the visits to someone held before trial or sent to prison (circumstance rows `held-known-visit` and the new `imprisoned-known-visit`) and plays the purpose `prison-visit`: the person inside asks the visitor for money on their account, a child looked after, a lawyer called or a word taken to the family. Both run through the one purpose engine (`purposeScene`), with facts from `src/director/custody-facts.ts`, each cited to the justice engine's record: how long they were away, whether the term ended their job, the sentence, the day they get out, the bail and the youngest child in the household. Lines gated by `requiresFacts`.

**Rules.** No new engine. A reply is written back on the scene.reply record by id; the endings keep a promise (agreed to a stay or help, agreed to the ask) or strain the tie (a talk put off, a refusal pressed). No dice: the asker's answers follow the traits through the shared decision table.

**Done when.** src/director/homecoming-scene.test.ts and src/director/prison-visit-scene.test.ts, in a world drawn from all 56 places (a release or a sentence from the justice engine's records where the played years give one, a clearly labeled staged cause otherwise), compose each purpose's tree whole, write a reply by record id and keep the ending's record; the English guards and the bank tests pass.

**Files.** src/director/custody-facts.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/circumstances.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json, scripts/scene-web/domains.json

**Notes.** Stopgaps: SG-WORDS-homecoming-stay-unread, SG-WORDS-prison-visit-limits-fixed, SG-WORDS-prison-visit-promise-unread, SG-WORDS-visit-ill-no-purpose. The `visit` type keeps its illness causes and the player-held cause with no purpose. No household record keeps a pet, so no visit asks after one.
