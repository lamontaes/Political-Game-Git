---
id: core-wiring-gaps
title: "Wiring gaps: any engine whose output nothing reads"
area: core
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "overnight pool item 9; docs/reports/trace-audit-2026-10-14/"
---

**What.** Find engines whose output nothing reads (trace audit or a one-year run): wire the read or delete the writer. One PR per engine, naming the record ids read.

**Rules.** An effect is a read; replace, never layer.

**Done when.** Per engine: the reader named by record id in a played year, or the writer deleted.

**Files.** varies

**Notes.** Add one item per engine found.
