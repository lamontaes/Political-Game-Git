---
id: words-catalog-coverage
title: "Order 1: keys on situations, moves on pieces, and the coverage table"
area: words
kind: feature
priority: 2
status: done
claimed-by: words/catalog-coverage
pr: "#4398"
blocked-on:
milestone:
source: "words-and-director order 1"
---

**What.** Give every situation type a key from a small fixed set (loss, threat, honor, news-received, favor-asked, vote-wanted, arrival, departure, routine); add the situation types the records can fire but the catalog lacks; give every part in every bank a move from scripts/english-corpus/moves.json; write npm run words:coverage (scripts/dialogue-batch/coverage-table.ts) producing docs/grading/coverage.md.

**Rules.** No new text; no hand-written player text; see .agents/skills/words-engine/SKILL.md.

**Done when.** PR body carries the table totals and the ten emptiest cells.

**Files.** src/director/data/situation-types.json, data/english/parts/, scripts/english-corpus/

**Notes.** Do this first.
