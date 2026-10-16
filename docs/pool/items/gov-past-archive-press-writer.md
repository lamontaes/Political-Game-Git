---
id: gov-past-archive-press-writer
title: "Archive stories are written by the press engine under its own archive kind and the news archive kinds are deleted"
area: gov
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The news archive writes its stories under kinds of its own (`archive:` plus the record kind) on the news module's story shape instead of through the press engine's writer. Name an archive kind in the press engine and have the press write each archive story, with its outlet, framing and facts. Delete the archive kinds in the news archive in the same change, so there is one writer for news, past or present.

**Rules.** Replace, never layer: the archive kinds and the stand-in story shape are deleted in the same change that moves the writer to the press engine. Ask why: each story keeps the record it was written from, and a reader's knowledge cites it.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, every story in the opening's archive is written through the press engine's writer with its source record id, src/core2/past-news.ts writes no archive kinds, and the stopgap SG-CORE-past-archive-kind is resolved by a test in src/core2/past.test.ts.

**Files.** src/core2/past-news.ts, src/core2/modules/press.ts, src/core2/modules/news.ts, src/core2/data/stopgaps.json

**Notes.** Split from gov-past-deaths-closures-archive. The press session had not named an archive kind when the archive was built (asked on PR #4190).
