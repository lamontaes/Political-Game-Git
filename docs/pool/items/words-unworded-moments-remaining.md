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
model: haiku
effort: low
root: rc4-hand-written-words
source: "split from words-unworded-moments, Oct 16"
claimed-at:
checked: fable 2026-11-10
---

**What.** Four moments the records fire still have no words or thin ones: the player saying they filed their papers after the filing visit, a new law taking effect, a held meeting, and the blame someone was told. Each is to be authored to the calibrated patterns as bank parts with move tags (author and date on each, at least two wordings each), and the director says them when the filing, law-effect, meeting and blame records fire. The clerk does not state a fee or a signature count, because no one pays a fee or gathers signatures to file (owner, Oct 13). The item named a bank file, filing-visit.json, that does not exist; the director side is src/director/filing-visit.ts and src/director/bring-it-up.ts. The first job is an inventory of which of the four moments still lack pieces.

**Cause.** Measured: `node -e 'const fs=require("fs");for(const f of fs.readdirSync("data/english/parts")){const t=fs.readFileSync("data/english/parts/"+f,"utf8");const n=(t.match(/filing-petition|law-took-effect|meeting|blame/g)||[]).length;if(n)console.log(f,n)}'` on main d64255aa (Nov 11) shows bank pieces for all four moments. I counted the pieces in data/english/parts/*.json whose key, uses or tag names the moment. (1) The player having filed, after the filing visit: the clerk's talk after filing is now the scheduled `filing` scene with purpose `filing-petition` (src/director/filing-visit.ts header), with 57 pieces in scene-talk.json, plus 5 journal and 4 news pieces for `candidate-filed`. (2) A law taking effect: 6 in news.json, 2 + 6 in journal.json (`law-took-effect` and `law-effect`), 8 in scene-words.json and 16 in scene-talk.json. (3) A held meeting: 16 in news.json, 13 headlines, 2 in journal.json, 6 in scene-words.json and 108 meeting pieces in scene-talk.json. (4) The blame someone was told: 27 in bring-it-up.json, 8 in conversation.json and 19 in scene-talk.json. Each has at least two wordings, so no moment is unworded. The Oct 13 ruling (no fee, no signature count) holds: the filing pieces state neither.

**Fix.** Nothing to build. The CTO drops the item as done by main. Whether a particular moment plays in a played year belongs to that moment's scene or producer item (scene-producers), not to this inventory.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** No hand-written player text: the words are bank parts authored with origin, author and date, never typed into code. Ask why: each line cites the event or record it voices. This is a game, not a spreadsheet: no new player step or form.

**Done when.** A second session (not the builder) runs a one-year played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (named in the PR body) and sees the filing visit and a law taking effect each produce worded lines citing the filing record id and the law record id, composed through the real engine; tests in tests/english-parts-banks.test.ts pass; the owner grades the lines in the next words batch.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-words.json, data/english/parts/bring-it-up.json, src/director/filing-visit.ts, src/director/bring-it-up.ts, tests/english-parts-banks.test.ts

**Notes.** Split from words-unworded-moments, which fixed the misfit school answer. The original item asked for the clerk to say the fee and signature count and the player to say "I paid the fee"; those are dropped under the Oct 13 ruling recorded in the elections engine (modules/elections.ts header). Released from idle draft #5180 by the CTO, Oct 26.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: drop the batch-grading clause; re-check which four moments still lack pieces.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-19). Cleared from the front matter and kept here.

Nov 11 (cause finder for Fable B): inventory done on main d64255aa. All four moments have bank pieces with at least two wordings, written since the item was filed. I propose dropping the item as done by main.
