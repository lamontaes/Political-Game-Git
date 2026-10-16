---
id: words-budget-line-sections
title: "A bill that changes a budget line reads as sections too"
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

**What.** A bill that changes a budget line (spending on highways, a department's pay) has no words for its section: `composeBill` in `src/english/bill-sections.ts` leaves such a bill unworded rather than describing it with the catalog's description. Author, for each budget line the bill catalog lists (`src/core2/data/legislature/budget-line-axes.json`), the subject, the purpose and the operative clause, so a section reads "the amount appropriated for highways shall be raised from $X to $Y", with the old and new amounts from the bill's provision row. The player would see the same real section form for a budget bill as for a law.

**Rules.** No hand-written player text: the words are authored data in `data/english/`, graded in a words batch. An effect is a read, not a record: the section reads the provision row's line, old amount and new amount when shown. One rule, all 56 places: budget lines are the same data everywhere. Replace, never layer: the unworded fallback is removed once every line has words.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named) a bill that changes a budget line is composed with a section naming the line, its old and new amounts, by bill id, and a test in `src/english/bill-sections.test.ts` fails when a catalog line has no words. The owner plays it: drafts a spending change and reads its section.

**Files.** data/english/bill-sections.json, src/english/bill-sections.ts, src/english/bill-sections.test.ts

**Notes.** Split from words-bill-sections-composed-from-the-record (PR #4554).
