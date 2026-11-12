---
id: words-purposes-court-hearing-verdict
title: "The hearing and verdict scenes play with a purpose: before the hearing and after the verdict someone close asks the player what they will do, from the justice record"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-hearing-verdict
pr: 8099
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); the last types on main with none
claimed-at: 2026-11-10T05:00:00.000Z
---

**What.** The `hearing` type (the justice engine's `justice.charged`) and the `verdict` type (`justice.convicted`, `justice.acquitted`) played generic talk. Each cause now has a purpose, by who the player is: charged or judged themselves (court-hearing-ask, court-verdict-ask: the household asks the player) or a household member is (court-hearing-asked, court-verdict-asked: they ask the player). Before the hearing: a lawyer, the plea, the family in court, the job, the children. After the verdict: what can still be done, who to call, what to tell the children and the job, the fine, the day they get out. The facts are read by `custodyFacts` from the case's records, the sentence row, the household and the job row, cited by id. A cause may name its own purpose, asker and asked, and the cause is chosen by the moment's label and its count of counterparts (the same hunks as the visited-ill stack).

**Rules.** No new engine. The narrator says only what the records show. A reply is written by record id; a promise is kept and a pressed no strains the tie. No dice.

**Done when.** src/director/court-purposes-scene.test.ts, in worlds drawn from places, charges the player and a household adult through the justice engine's own `chargeDecision`, lets the director cast the hearing and the verdict, composes each through the purpose engine with each fact cited to its records, and writes a reply that keeps a promise by record id; the English and families guards pass.

**Files.** src/director/custody-facts.ts, src/director/purpose-scene.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: new SG-WORDS-court-ask-no-counsel (the justice engine keeps no lawyer, so kin ask) and SG-WORDS-court-ask-promise-unread. The investigation row is hand-staged; the charge, plea, trial and verdict are the justice engine's. Voice read: public defender and county court guidance on arraignment (expect a plea question, keep answers short, let the lawyer speak), and family guides on telling children about a parent's prison term (calm moment, honest and simple, agree beforehand what to say).
