---
id: play-meeting-bill-title
title: "The meeting screen's bill item reads the bill's title record"
area: play
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "found by gov-record-defects-finish"
---

**What.** The seat sheet reads `bill.title.subjects`, but the meeting screen's bill item (src/bench/play.mjs, `renderPacket`, the office-day packet's `item.provisions`) still prints provisions by series, question or line. Read the title record there too.

**Rules.** An effect is a read; screens show record data and control names (no hand-written player text).

**Done when.** In a drawn place, a bill on the council's agenda shows the same section names in the meeting screen as on the seat sheet; a bench test names the bill id.

**Files.** src/bench/play.mjs, src/core2/modules/office-day.ts (the packet's item)

**Notes.** Found while finishing gov-record-defects-finish (PR #4480).
