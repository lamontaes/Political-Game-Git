---
id: words-archive-law-catalog-name
title: "Archived law stories fail the catalog-name wording check"
area: words
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/archive-law-catalog-name
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T09:11:21.836Z
---

**What.** On clean main, archive-words.test.ts cannot word any archived effective-law story with a catalog name in a drawn world. Merger 0 independently reproduced expected 0 to be greater than 0 at line 58 with ARCHIVE_WORDS_SEED=a54a2355f968bdb6, place 1614680.

**Rules.** Fix the archive fact-to-catalog-to-English reader at its root. Preserve the positive collection and wording/source-ID assertions; do not skip, narrow or loosen the test.

**Done when.** The archived-law case in src/bench/archive-words.test.ts passes for the reported seed and a new drawn-place seed, with named law-history/story IDs resolving to a catalog name and rendered effective date.

**Files.** src/core2/past-news.ts, src/bench/archive-words.ts, src/bench/archive-words.test.ts

**Notes.** TODO
