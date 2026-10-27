---
id: words-address-flows-from-records
title: "The President's address reads as a speech: each figure tied to an ask, visits with a reason, an inauguration story on the news"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: CTO opening root-cause report, Oct 27
---

**What.** The address is one sentence per number (src/english/english-opening-speech.ts:92-125, src/director/opening-story.ts:369-393), so it reads as a stat readout. The bank fragment "I was in {place}." (data/english/parts/opening-speech.json:2704) is said alone with no reason. On inauguration night the news says "John Holt won." because the address is worded as an election story (src/director/opening-story.ts:779). The owner's Oct 27 ruling asks for an address that flows like a real speech. Coordinate with play-first-09's claim (words/opening-address-from-records). Evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Rules.** No hand-written player text: new passages are bank pieces with slots, graded by the owner's sitting notes, and the old per-number moves and bare place fragments are deleted in the same PR. Wire to the world: each figure line names the ask it bears on, read from the President's goals and the macro month records. Ask why: every sentence cites its record ids.

**Done when.** In two played worlds (buildBenchWorld) in drawn places and seeds the builder did not choose, no address sentence states a figure without a clause tying it to an ask or to the listener, every place line carries the visit record's reason, the inauguration night's news uses an inauguration story kind citing inauguration record id, and a test beside src/english/english-opening-speech.ts fails on the old per-number shape.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/english/english-opening-speech.ts, src/director/opening-story.ts, data/english/parts/opening-speech.json, src/english/english-newscast.ts

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: words.
