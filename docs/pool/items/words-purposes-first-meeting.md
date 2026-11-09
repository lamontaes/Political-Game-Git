---
id: words-purposes-first-meeting
title: "A new coworker's first meeting and a friend's ask each play a scene with a purpose, from the job, school, party and town records"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-first-meeting
pr: pending
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); the golden path's "meet people" step
claimed-at: 2026-11-09T15:00:00.000Z
---

**What.** The `first-meeting` scene (a new hire at the player's employer) and the `becoming-friends` scene (a tie that grew) had no purpose, so they played small talk. `first-meeting` now plays the purpose `introduction`: the newcomer comes over and asks something grounded in what the two share (how the job runs, the same job, the school they were both at in one year, the children they have at one school, the party, the town the newcomer drives in from). `becoming-friends` plays `friend-ask`: the friend invites the player along or asks a favor, with the same shared facts when a record gives them. Both run through the one purpose engine (`purposeScene`), with facts from `src/director/meeting-facts.ts` read from the jobs, school and parties engines' records and cited by id. Lines are gated by `requiresFacts`.

**Rules.** No new engine. A reply is written on the scene.reply record by id; the endings keep a promise (agreed to show them around, agreed to the ask) or strain the tie (a put-off or a no that was pressed); every reply is also time together on the tie. No dice: the asker's answers follow the traits through the shared decision table.

**Done when.** src/director/meeting-scene.test.ts, in worlds drawn from all 56 places, plays a hand-staged hire into a first-meeting scene through the director's own producer, grows a tie into a becoming-friends scene, finds each shared fact in the world's own records, writes a reply by record id and keeps the ending; the English guards and the bank tests pass.

**Files.** src/director/meeting-facts.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-meeting-no-club-records, SG-WORDS-meeting-promise-unread, SG-WORDS-friend-ask-plan-unrecorded. The introducer role (a third person who brings the newcomer over) was removed; the newcomer introduces themselves. `first-meeting` still has only the new-coworker cause (the new-neighbor producer is awaited).
