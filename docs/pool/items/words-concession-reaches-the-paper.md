---
id: words-concession-reaches-the-paper
title: "Conceding or refusing on the call after a lost race is printed in the race's story"
area: words
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The concession call after a lost race (director purpose concession-call, scene race-lost) ends in conceded or not-yet, and no engine reads either: its ending keeps story-runs, which nothing reads. Path 6 asks for a real concession. The director marks the reply conceded yes or no, the press keeps a public concession record, and the paper's race story says it of the runner-up.

**Rules.** An effect is a read, not a record: the paper's election story reads the concession record. No hand-written player text: the sentences are news bank pieces. One rule, all 56 places: drawn places, seed printed. Ask why: the sentence cites the concession record id.

**Done when.** In a drawn place (buildBenchWorld), the runner-up who concedes on the call is told in the race's printed story ('X called Y to concede.'), and one who refuses is told ('X would not concede the race.'), each sentence citing concession:<contest>:<person>:<yes|no>; src/director/concession-reported.test.ts passes on a fresh seed.

**Files.** src/director/purpose-scene.ts, src/director/data/scene-talk-rules.json, src/core2/modules/press.ts, src/bench/printed-words.ts, data/english/parts/news.json

**Notes.** Split from words-venue-speeches-delivered by Lane 3, Nov 3 (lane page: 'victory and concession only'). The victory speech stays in that item.
