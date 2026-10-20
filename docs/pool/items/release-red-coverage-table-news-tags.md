---
id: release-red-coverage-table-news-tags
title: "coverage-table.test.ts fails on main: two news.json law-took-effect parts lack their move key"
area: words
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** tag-moves.ts --check reports 2 part tags differ: news.law-took-effect.measure-took-effect-on-date and its sibling carry a move tag without the key the rules give them.

**Rules.** Run the tagger; commit only the two tag keys, no reformatting of the bank.

**Done when.** node --import tsx scripts/english-corpus/tag-moves.ts --check exits 0 and coverage-table.test.ts passes.

**Files.** data/english/parts/news.json

**Notes.** TODO
