---
id: words-purposes-celebration-gathering
title: "A celebration and a birthday with a relative missing each play a scene with a purpose, from the marriage, job, birth-date, place, life-news and kin-contact records"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by: story/purposes-celebration-gathering
pr: #8072
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); the golden path's "meet people" step
claimed-at: 2026-11-09T20:00:00.000Z
---

**What.** The `celebration` scene (a wedding or a new job in the player's household) and the `gathering-missing` scene (a birthday at home with the closest relative who lives elsewhere missing) had no purpose, so they played small talk. `celebration` now plays `celebration-ask`: a relative at the occasion asks the player for something it brings (a few words for everyone, a picture, a cake to cut, a talk about an old quarrel the tie's record kept, a hand finding work). `gathering-missing` plays `gathering-ask`: someone in the household asks the player to reach out to the one who was missing (call, write, visit, make the first move, congratulate). Both run through the one purpose engine (`purposeScene`). The facts are read from records the world keeps and cited by id: for a celebration the `family.married` record (the spouse), the job row and its employer, whose occasion it is, the guest's place, a child born to the guest and the jobs engine's seeker row (`src/director/celebration-facts.ts`); for a gathering the `family.gathering-missed` record (whose birthday, who was missing), the honoree's birth date for the age, the missing relative's place and lately changed life (`src/director/life-news.ts`: a child, a wedding, a move, new work, a serious illness) and the tie's quarrel (`src/director/gathering-facts.ts`). A new `you` role (the subject) keeps the player from being cast as the one who asks.

**Rules.** No new engine. A reply is written on the scene.reply record by id; the endings keep a promise (agreed to the ask) or strain the tie (a no that was pressed); every reply is also time together on the tie. No dice: the asker's answers follow the traits through the shared decision table. A fact with no record behind it is left out and the lines that need it never play; the gathering lines never claim why the relative stayed away.

**Done when.** src/director/celebration-gathering-scene.test.ts, in worlds drawn from all 56 places, plays the partnerships engine's own missed-gathering records in a played year, plays a hand-staged wedding through the partnerships writer, finds each fact in the world's own records, writes a reply by record id and keeps the ending; the English guards and the bank tests pass.

**Files.** src/director/celebration-facts.ts, src/director/gathering-facts.ts, src/director/life-news.ts, src/director/reunion-facts.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/scene-talk-rules.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-celebration-ask-unrecorded, SG-WORDS-gathering-ask-unrecorded, SG-WORDS-celebration-gathering-promise-unread. Stacked on story/purposes-reunion-letter (PR #8068). A played year seldom shows a wedding for the player, so the test stages one; the new-job facts are read from the world's own job rows. A birthday or a birth is not yet a celebration cause (the director has no moment for them): the birthday case is the gathering. The old conversation-register lines for these two types are no longer read by these scenes.
