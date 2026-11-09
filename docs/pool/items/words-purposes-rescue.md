---
id: words-purposes-rescue
title: "A rescue plays a scene with a purpose, from the rescue record, the family records and the witnesses"
area: words
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: story/purposes-rescue
pr: pending
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); the golden path's "meet people" step
claimed-at: 2026-11-09T21:00:00.000Z
---

**What.** The `rescue` scene (a housemate got the player help when a serious illness began) had no purpose, so it played small talk. It now plays `rescue-ask`: the one who called for help asks the player for something afterward (a ride to the doctor, a visit to one, to stay close for a few days, a promise to say the moment they feel sick again, leave to tell the family, a word with a child who was in the room). It runs through the one purpose engine (`purposeScene`). The facts are read from `health.rescued` (rescue.ts, written from the health engine's onset record) and cited by id: whether the rescuer is the player's partner (the family records), whether a child was in the room and whether other grown people saw it (the record's witnesses and their birth dates), in `src/director/rescue-facts.ts`. The illness itself is never named; the record does not say its kind.

**Rules.** No new engine. A reply is written on the scene.reply record by id; the endings keep a promise (said yes) or strain the tie (a no that was pressed); every reply is also time together on the tie. No dice: the asker's answers follow the traits through the shared decision table. A fact with no record behind it is left out and the lines that need it never play.

**Done when.** src/director/rescue-scene.test.ts, in worlds drawn from all 56 places, begins the player's illness through the health engine, plays the rescue record the engines wrote, finds each fact in the world's own records, writes a reply by record id and keeps the ending; the English guards and the bank tests pass.

**Files.** src/director/rescue-facts.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-rescue-ask-unrecorded, SG-WORDS-rescue-promise-unread. Stacked on story/purposes-celebration-gathering (PR #8072). The illness is begun by the test through the health engine (hand-staged trigger); everything after is the engines' own. Voice read: news and oral-history quotes from people rescued, their families and the neighbors who helped.
