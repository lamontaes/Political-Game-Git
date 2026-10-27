---
id: words-newspaper-ledes-unread
title: "The newspaper ledes bank is read by no code: wire it to the press engine's printed stories or delete it"
area: words
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** data/english/parts/newspaper-ledes.json holds six hand-written lede lines, held until graded, and no code in src reads it: the press engine's printed stories are worded from news.json and headlines.json. Batch 22 counted its six lines among the 141 held lines, but the table read can never show them, because nothing would ever say them in play. An effect is a read: a bank nobody reads is an unregistered placeholder.

**Rules.** Replace, never layer: either the press engine's story wording reads the bank for a printed story's lede, or the file and its batch 22 rows are removed in the same change, and the PR body counts what was removed. No hand-written player text ships ungraded.

**Done when.** Either a test shows a printed story in a played world (buildBenchWorld) in a drawn place worded with a newspaper-ledes part, named by its story record id, or the bank file is deleted and a test fails if any data/english/parts file has no reader in src.

**Files.** data/english/parts/newspaper-ledes.json, src/english/english-newscast.ts, src/bench/archive-words.ts, data/english/batches/batch-22.json

**Notes.** TODO
