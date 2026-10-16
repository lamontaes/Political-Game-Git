---
id: world-stopgaps-by-kind
title: "Replace the faked-mechanic and missing-record stopgaps, one engine per PR"
area: core
kind: stopgap
priority: 2
size: L
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "reissue item 8; overnight pool item 3"
---

**What.** About 30 faked-mechanic rows and the missing-record rows remain in stopgaps.json. The per-engine groups are separate stopgap items in this pool; this item is the standing instruction to take them in order.

**Rules.** Never close a row by deleting it.

**Done when.** Row resolved with the mechanic or the feature that needs it deleted.

**Files.** src/core2/data/stopgaps.json

**Notes.** See the stopgap-* items.
Dropped 2026-10-15: duplicate of the per-engine stopgap items (core-stopgap-*, laws-stopgap-*, world-stopgap-*): each is already its own pool item with a done-when, so the standing instruction is redundant. Duplicate of the pool, see above.
