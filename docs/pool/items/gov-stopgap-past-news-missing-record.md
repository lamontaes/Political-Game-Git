---
id: gov-stopgap-past-news-missing-record
title: "Stopgaps in past-news (missing-record): 2 open"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/past-news.ts, kind missing-record"
---

**What.** Replace or clear the 2 open missing-record stopgap row(s) in src/core2/past-news.ts: SG-CORE-past-archive-kind, SG-CORE-past-no-deaths-closures. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/past-news.ts

**Notes.** First row: Archive stories use kinds prefixed 'archive:' in the news engine's story shape, and keep their facts on the story with a pointer in the reader's knowledge.
