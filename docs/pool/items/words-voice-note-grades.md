---
id: words-voice-note-grades
title: "The owner's voice-note grades from batches 11 to 21 become grade files, so the lines he liked ship"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner, Oct 24, to the Words session: take everything I said I liked in the voice notes from the batches before, and the lessons learned from them, and start getting it in the game, since you can't get my live grades. His reviews of batches 11 to 21 are recorded in docs/coordination/OWNER-DECISIONS.md and quote lines he graded or praised (You'll need friends after this vote. I won't be one., graded 5) and lines he rejected (I'd think hard about that., graded 1). Each quoted line is matched to its part in data/english/parts and written as a grade in data/english/grades, so apply-grades.ts releases the liked lines and keeps the rejected ones out of play.

**Rules.** No hand-written player text: a line ships only on the owner's own grade, here the grades his voice notes already gave, each citing the ruling it came from. Look before you ask: every grade quotes the OWNER-DECISIONS.md entry it was read from, so no session asks him again.

**Done when.** A test shows every line quoted as liked in the batch 11 to 21 rulings reaching the part ledger as good and every rejected one as bad, by part key; in a played world (buildBenchWorld) in a drawn place a scene is composed from a released line, named by record id.

**Files.** data/english/grades/, scripts/dialogue-batch/apply-grades.ts, docs/coordination/OWNER-DECISIONS.md

**Notes.** TODO
