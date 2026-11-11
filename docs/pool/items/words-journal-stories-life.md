---
id: words-journal-stories-life
title: "Journal entries for a move, a birth, a partnership, a death in the family and a school's end are told as small stories from the records they read"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #8129
blocked-on:
lead: words
source: owner batch 3 (journal entries told as statements, not stories); extends words-journal-as-stories to the other common life events
claimed-at:
merged-at:
---

**What.** The `follow` fields of words-journal-as-stories now follow five more rows, each only when the record gives the facts its sentences name: a move (where they came from, from the moves engine's record; the children born before it who came with them; their age), a child's birth (their age; the first child, by name), a partnership (how long they have been together), a death in the family (the age of the person; whether the record's topic names a serious illness), and a school year's end (how long they had been at the school; their age). The voice is read from the 1936-39 diary of an upstate New York woman and a veteran's oral history, plain and short and naming who helped. A marriage row does not exist in the journal, so no marriage story is written. Seen: in the player's journal, a move, a birth or a death in the family reads as a small story, not a bare statement.

**Rules.** An effect is a read, not a record: each story's sentences read facts from the records the journal row names, and claim no feeling the records lack. No new engine; sentences are at most ten words; lines join by the time between them.

**Done when.** src/director/journal-life-stories.test.ts plays a drawn world for a year and prints the life-event entries written with their record ids; journal.test.ts, journal-story.test.ts, the English and families guards pass.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, src/english/journal-words.ts, data/english/parts/journal.json

**Notes.** Voice read: the 1936-39 diary of an upstate New York woman and a veteran's oral history (plain, short, naming who helped and the baby by name, e.g. "Myrtle's baby born Dec 26. Nancy Joane."; "15 Feb Sat. Warm. moved. Joe, Clarke & Chan helped."). A marriage row does not exist in the journal (only a partnership, "I met my partner"), so no marriage story is written.

Not seen in the game (2026-11-11, second-session-2): Artas, South Dakota (drawn), seed f6723594-64e1-42c4-ad8e-f3d37b8f7447, main 85d1e1ff: journal after 15 months tells one move twice, 'my uncle moved away' then 'my relative moved away', as bare statements, and a mother's new job twice, not as small stories
