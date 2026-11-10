---
id: words-journal-stories-life
title: "Journal entries for a move, a birth, a partnership, a death in the family and a school's end are told as small stories from the records they read"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/journal-stories-life
pr: 8129
blocked-on:
lead: words
source: owner batch 3 (journal entries told as statements, not stories); extends words-journal-as-stories to the other common life events
claimed-at: 2026-11-10T10:00:00.000Z
---

**What.** The `follow` fields of words-journal-as-stories now follow five more rows, each only when the record gives the facts its sentences name: a move (where they came from, from the moves engine's record; the children born before it who came with them; their age), a child's birth (their age; the first child, by name), a partnership (how long they have been together), a death in the family (the age of the person; whether the record's topic names a serious illness), and a school year's end (how long they had been at the school; their age).

**Rules.** No new engine. Sentences are at most ten words, require their facts by their slots, and claim no feeling the records lack. Lines join by the time between them.

**Done when.** src/director/journal-life-stories.test.ts plays a drawn world for a year and prints the life-event entries written with their record ids; journal.test.ts, journal-story.test.ts, the English and families guards pass.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, src/english/journal-words.ts, data/english/parts/journal.json

**Notes.** Voice read: the 1936-39 diary of an upstate New York woman and a veteran's oral history (plain, short, naming who helped and the baby by name, e.g. "Myrtle's baby born Dec 26. Nancy Joane."; "15 Feb Sat. Warm. moved. Joe, Clarke & Chan helped."). A marriage row does not exist in the journal (only a partnership, "I met my partner"), so no marriage story is written.
