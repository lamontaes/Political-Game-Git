---
id: words-purposes-reunion-letter
title: "A reunion and a relative's letter each play a scene with a purpose, from the thread, move, household, job and kin-contact records"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/purposes-reunion-letter
pr: 8068
blocked-on:
lead: words
source: CTO brief, Nov 9 ("a purpose for every scene kind that lacks one"); the golden path's "meet people" step
claimed-at: 2026-11-09T18:00:00.000Z
---

**What.** The `reunion` scene (someone the player has not been in touch with for a long time comes back) and the `letter` scene (a relative who lives elsewhere writes) had no purpose, so they played small talk. `reunion` now plays the purpose `reunion-ask`: the one who comes back asks for something from seeing the player again (to start over after a falling-out the thread kept, to be told how the player has been, for a work lead when the jobs engine holds them as a seeker, for a visit, to be met with a new child or a spouse). `letter` plays `letter-ask`: the relative's letter asks for a visit, a letter back or news, and the player's answer is written back. Both run through the one purpose engine (`purposeScene`). The facts are read from records the world keeps and cited by id: how long apart (the director's renewing turn on the pair's thread now keeps the last day they were in touch), where they live (the person's place), what changed in their life since (`src/director/life-news.ts`: a child born in the household, a wedding, a move, new work, a serious illness), and for a letter the `family.contact` record that wrote it, a birthday missed at the player's table (`family.gathering-missed`) and the writer's own birthday.

**Rules.** No new engine. A reply is written on the scene.reply record by id; the endings keep a promise (agreed to the ask) or strain the tie (a put-off or a no that was pressed); every reply is also time together on the tie. No dice: the asker's answers follow the traits through the shared decision table. A fact with no record behind it is left out and the lines that need it never play.

**Done when.** src/director/reunion-letter-scene.test.ts, in worlds drawn from all 56 places, plays a hand-staged faded tie into a reunion through the director's own producer, plays the kin-contact engine's own letters in a played year, finds each fact in the world's own records, writes a reply by record id and keeps the ending; the English guards and the bank tests pass.

**Files.** src/director/life-news.ts, src/director/reunion-facts.ts, src/director/letter-facts.ts, src/director/purpose-scene.ts, src/director/ledger.ts, src/director/types.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json, data/english/parts/scene-talk.json

**Notes.** Stopgaps: SG-WORDS-reunion-ask-unrecorded, SG-WORDS-letter-ask-unrecorded, SG-WORDS-reunion-letter-promise-unread. A reunion needs a pair out of touch for about a year and a half with a history the director weighs; the opening starts every tie fresh, so a played year rarely shows one and the test stages the tie. The old conversation-register lines for `reunion` (the old school and shared work openers) are no longer read by this scene.
