---
id: words-purposes-visited-held
title: "When the player is held, a relative's visit plays a scene with a purpose: they bring news, money, a lawyer or ask whether to come again, from the justice record"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-visit-held
pr: 8096
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); stopgap SG-WORDS-visit-ill-no-purpose
claimed-at: 2026-11-10T04:00:00.000Z
---

**What.** The `visit` cause where the player is the one held (`justice.imprisoned` or `justice.held-before-trial`, no counterpart; a relative comes to the player) played generic talk. It now plays `visited-held-ask`: the visitor, the closest kin the player's ties name, offers money for the account, a lawyer, the house, what to tell a child, or the employer, or asks whether to come again. The player answers yes, promises to say what they need, asks what it would cost, or declines. Facts are read from the justice record by `custodyFacts` (the sentence, the day they get out, the bail, the child in the household, the visitor being a partner, the employer from the job row), cited by id. A person held before trial now reaches the director as a feeling record, the same as a sentence.

**Rules.** No new engine. The narrator says only what the records show (no guard, no glass). A reply is written by record id; a promise is kept and a pressed no strains the tie. No dice.

**Done when.** src/director/visited-held-scene.test.ts, in worlds drawn from places, stages a sentence and a hold for the player as the justice engine writes them, lets the director cast the visit, composes it through the purpose engine with each fact cited to its records, and writes a reply that keeps a promise by record id; the English and families guards pass.

**Files.** src/director/custody-facts.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/scene-rows.json, src/director/data/director.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-visit-ill-no-purpose resolved; new SG-WORDS-visited-held-offer-unrecorded and SG-WORDS-visited-held-promise-unread. The sentence and hold are hand-staged by the test as justice writes them. Voice read: Marshall Project essays and reader advice on prison visits (plan the talk, save hard topics for the visit, families want to see you doing well) and Prison Policy Initiative on what families pay for calls and commissary.
