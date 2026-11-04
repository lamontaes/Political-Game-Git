---
id: words-owed-talk-reply-facts
title: "A reply that sets a meeting or puts a matter off records the owed talk (Lane 3's side of people-owed-talk-record)"
area: words
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: lane3/owed-talk-facts
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T13:40:25.595Z
---

**What.** agreements/2-3.md, owed talk: Lane 2 writes the owed-talk record; Lane 3 owns the reply facts. A scene reply whose ending keeps meeting-set, or ends put-off or not-yet, carries owedWith, owedTopic and owedDueOn on its scene.reply record.

**Rules.** No dice: the due day is a TUNABLE in scene-talk-rules.json (owedTalk.dueDays). Ending ids and keeps only; no sentence. The people engine never parses English for a promise.

**Done when.** In a played world (family-stake-scene.test.ts, drawn places, place and seed named), a deflected filing talk's reply record names the relative, the stake and a due day after the reply.

**Files.** src/director/purpose-scene.ts, src/director/data/scene-talk-rules.json, src/director/family-stake-scene.test.ts

**Notes.** Lane 3, Nov 4: built on lane3/owed-talk-facts. Lane 2's record: people-owed-talk-record.
