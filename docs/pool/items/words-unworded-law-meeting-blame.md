---
id: words-unworded-law-meeting-blame
title: "A law taking effect, a held meeting and a blame someone was told get authored words the director says from their records"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:15:39.204Z
---

**What.** Three moments the records fire still have no words: a new law taking effect, a held meeting, and the blame someone was told. Author each as bank parts with move tags, author and date, and at least two wordings each, in the bank that fits (scene-words.json and bring-it-up.json). Have the director say them when the law-effect, meeting and blame records fire, citing the record each voices. The filed-papers moment is done in the filing visit already.

**Rules.** No hand-written player text: the words are bank parts authored with origin, author and date, never typed into code. Ask why: each line cites the event or record it voices, by id. This is a game, not a spreadsheet: no new player step or form.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (named in the PR body), a law taking effect, a held meeting and a told blame each produce a worded line citing the law, meeting and event record id, composed through the real engine, and tests in tests/english-parts-banks.test.ts pass; the owner grades the lines in the next words batch.

**Files.** data/english/parts/scene-words.json, data/english/parts/bring-it-up.json, src/director/bring-it-up.ts

**Notes.** Split from words-unworded-moments-remaining (PR #5180 did the filed-papers moment).
