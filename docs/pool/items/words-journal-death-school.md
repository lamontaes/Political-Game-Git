---
id: words-journal-death-school
title: "The journal tells a school year's end (never written before) and proves a death in the family's story, in drawn worlds"
area: words
kind: bug
priority: 2
size: S
status: merged
claimed-by: story/journal-death-school
pr: #8141
blocked-on:
lead: words
source: words-journal-stories-life, whose death and school stories no played year produced
claimed-at: 2026-11-10T11:00:00.000Z
merged-at: 2026-11-10T12:17:39.422Z
---

**What.** Why no run produced them. School: the school engine writes a student's graduation as a row in its results table, not as a logged event, and the journal had no source of moments for it, so the school year's end row could never fire (only the school's start was ever told). `graduationResults` (src/director/school.ts) now reads those rows and the journal makes a moment of each. Death: a relative's death is real but rare (it needs an illness and a death date inside the year), and a 35-year-old's parents are mostly in the wider population, so the test fills in the oldest relative, begins their serious illness through the health engine and runs on until the engine's own death for them. The invented "for some time" sentence is removed (the record has no span).

**Done when.** src/director/journal-death-school.test.ts draws worlds until it finds a graduation (the player seventeen on day one) and a death (the oldest relative ill), and prints each entry with its record ids; journal.test.ts, journal-story.test.ts, the English and families guards pass.

**Files.** src/director/journal.ts, src/director/school.ts, data/english/parts/journal.json
