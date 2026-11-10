---
id: words-unworded-moments-remaining
title: "Words for a filed paper, a law taking effect, a held meeting and a blame someone was told"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: low
root: rc4-hand-written-words
source: "split from words-unworded-moments, Oct 16"
claimed-at:
checked: fable 2026-11-10
---

**What.** Four moments the records fire still have no words or thin ones: the player saying they filed their papers after the filing visit, a new law taking effect, a held meeting, and the blame someone was told. Each is to be authored to the calibrated patterns as bank parts with move tags (author and date on each, at least two wordings each), and the director says them when the filing, law-effect, meeting and blame records fire. The clerk does not state a fee or a signature count, because no one pays a fee or gathers signatures to file (owner, Oct 13). The item named a bank file, filing-visit.json, that does not exist; the director side is src/director/filing-visit.ts and src/director/bring-it-up.ts. The first job is an inventory of which of the four moments still lack pieces.

**Cause.** Needs cause. Looked at src/director/filing-visit.ts, src/director/bring-it-up.ts and data/english/parts (there is no filing-visit.json there); which of the four moments lack bank pieces today is not established.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session, to find which moments have no bank pieces today. When it runs out, write what was found in the item and stop.

**Rules.** No hand-written player text: the words are bank parts authored with origin, author and date, never typed into code. Ask why: each line cites the event or record it voices. This is a game, not a spreadsheet: no new player step or form.

**Done when.** A second session (not the builder) runs a one-year played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (named in the PR body) and sees the filing visit and a law taking effect each produce worded lines citing the filing record id and the law record id, composed through the real engine; tests in tests/english-parts-banks.test.ts pass; the owner grades the lines in the next words batch.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-words.json, data/english/parts/bring-it-up.json, src/director/filing-visit.ts, src/director/bring-it-up.ts, tests/english-parts-banks.test.ts

**Notes.** Split from words-unworded-moments, which fixed the misfit school answer. The original item asked for the clerk to say the fee and signature count and the player to say "I paid the fee"; those are dropped under the Oct 13 ruling recorded in the elections engine (modules/elections.ts header). Released from idle draft #5180 by the CTO, Oct 26.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: drop the batch-grading clause; re-check which four moments still lack pieces.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-19). Cleared from the front matter and kept here.
