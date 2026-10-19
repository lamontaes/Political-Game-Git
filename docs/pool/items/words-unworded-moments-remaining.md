---
id: words-unworded-moments-remaining
title: "Words for a filed paper, a law taking effect, a held meeting and a blame someone was told"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
source: "split from words-unworded-moments, Oct 16"
claimed-at: 2026-10-19T22:04:58.951Z
---

**What.** Four moments the records fire still have no words or thin ones: the player saying they filed their papers after the filing visit, a new law taking effect, a held meeting, and the blame someone was told. Author each to the calibrated patterns as bank parts with move tags (author and date on each, at least two wordings each), and have the director say them when the filing, law-effect, meeting and blame records fire. The clerk does not state a fee or a signature count, because no one pays a fee or gathers signatures to file (owner, Oct 13).

**Rules.** No hand-written player text: the words are bank parts authored with origin, author and date, never typed into code. Ask why: each line cites the event or record it voices. This is a game, not a spreadsheet: no new player step or form.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose (named in the PR body), the filing visit and a law taking effect each produce worded lines citing the filing record id and the law record id, composed through the real engine, and tests in tests/english-parts-banks.test.ts pass; the owner grades the lines in the next words batch.

**Files.** data/english/parts/filing-visit.json, data/english/parts/scene-words.json, data/english/parts/bring-it-up.json, src/director/filing-visit.ts, src/director/bring-it-up.ts

**Notes.** Split from words-unworded-moments, which fixed the misfit school answer. The original item asked for the clerk to say the fee and signature count and the player to say "I paid the fee"; those are dropped under the Oct 13 ruling recorded in the elections engine (modules/elections.ts header).
