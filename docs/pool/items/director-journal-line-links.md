---
id: director-journal-line-links
title: "Each Journal line records how it follows the one before (cause, feeling or time)"
area: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
branch: lane3/journal-links
---

**What.** Split from director-journal-one-story: every Journal line after the first carries a link to the line before it, by cause (its records name the earlier line's records or share a fact such as the contest or bill, never only a person or place), feeling (the mood moved the same way) or time, with the record ids that join them. The joining words and another's turn told through the tie stay on director-journal-one-story. This item is the link only, a record of how one line follows another; the words that voice the link are a later piece from the journal bank.

**Rules.** One engine per mechanic: the Journal reads the records; the link decides nothing. No hand-written player text: the joining words come from the journal bank in a later PR.

**Done when.** In two played worlds (buildBenchWorld, two years) named with place and seed, every line after the first has a link to the line before with record ids, and a cause link names records of both lines (journal-story.test.ts).

**Files.** src/director/journal.ts, src/director/journal-story.test.ts

**Notes.** Lane 3, Nov 4: built on lane3/journal-links.

Released by next (2026-11-10): no push to lane3/journal-links since 2026-11-04 10:53 UTC, more than twice its 4-hour time box. Continue on branch lane3/journal-links.
