---
id: words-journal-law-effect-reader
title: "The journal tells a resident's learned law effect, naming the law by the bill that enacted it"
area: words
kind: wiring
priority: 1
size: S
status: open
claimed-by:
pr: #6117
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** When a resident ties a change in what they pay to a law they heard about, the price engine writes an event:law.effect-learned record and the director gives them the moment, but the journal had no row or words for it, so it said nothing. This item is the journal's reader for that record: a row in journal-rows.json and bank lines that name the law by the bill that enacted it, read from the law row's enactedByBill. It was split from words-law-effect-learned-journal on Oct 26 (Merger 1 on #6117): the reader is this item, and the pinned end-to-end line stays with laws-end-to-end-proof, whose test it is.

**Rules.** Words engine: the journal composes its line from the record's own facts and the English engine's bank, never typed text. Wire to the world: the line cites the learned-effect record, the law row and the bill it names. Ask why: no line names a law no bill enacted.

**Done when.** In a played world (buildBenchWorld) in a drawn place with a seed the builder did not choose, a resident whose law.effect-learned record becomes their moment has a journal line read from the shipping bank that names the law by its enacting bill and cites the record, the law row and the bill by record id; the test fails with the journal row removed.

**Files.** src/director/data/journal-rows.json, data/english/parts/journal.json, src/director/journal-law-effect.test.ts

**Notes.** TODO
