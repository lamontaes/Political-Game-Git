---
id: words-death-how-lines-wait-on-record-facts
title: "Three answers to a relative's 'How?' need facts no record holds yet"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
source: Account lead S3, from #9384 review, Nov 15, 2026
checked: s3 2026-11-15
---

**What.** The Words lead's ruling of Nov 14, 22:50Z on how a relative says how someone died holds three kinds of answer that are not in the game, because no record holds the fact each needs: that the person was old for their place ("He was old. It was his time."; "He had a long life. It just ended."), that an illness was kept inside the house ("He had {illness}. He didn't want it talked about."), and that nothing was known to be wrong ("Nobody saw it coming."; "It was sudden. That's all anybody can tell us."; "We don't know. Nothing was wrong that we knew of."; "He wasn't sick. He was just gone."). Seen: the talk at home after a relative's death, at Grants Pass OR (s3-how:0), where a death with an illness unnamed in the record has only "That's all I know.".

**Cause.** Found in code: (1) no reader turns a death's age into "old for this place": the place's life table is in src/core2/data/health/ssa-2023-period-life-table.json but nothing exposes an age-against-expectancy value; (2) no record says who a person told of their illness, so "kept inside the house" cannot be read; (3) every full person's death is booked by a case with an onset event (src/core2/modules/health.ts, `deathsByDate` is filled at onset), so "nothing was wrong" is never true of a full person: the sudden lines were built, shown unreachable by M5 and deleted in #9384.

**Fix.** Add the three facts to the record that already exists: an age-against-expectancy reader beside the health engine's life-table use (slide, no fixed year); who heard of an illness from the person's own knowledge records; and an unnamed-condition mark on the onset so a death with an unnamed illness has its own answer ("He was sick for a while" only if the onset date is read). Then place the ruled lines on those facts, as written.

**Time box.** 3 hours, Sonnet medium.

**Rules.** No dice; the age reads the place's own table with no fixed year; a line says only what the record holds; plain American English.

**Done when.** In three drawn places (fresh seed, each named) a relative's death with each fact is told with the ruled line and the record id of the fact; a second session plays one on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/director/conversation.ts, data/english/relative-news-words.json, data/english/parts/conversation.json

**Notes.** Filed on the #9384 branch (claude/words-s3-death-how-wordings).

Nov 15 (second reader, #9384): "{He} took {his} own life. None of us knew." is built on the plain cause-suicide mark because no record of an illness of the mind exists in the health engine; when one does, place the warm line only where no such illness was on a record the house knew of (the ruling's own condition) and keep the plain line otherwise.
