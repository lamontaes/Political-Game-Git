---
id: director-journal-chapters-own-turns
title: "A Journal chapter opens only on the player's own turn or a relative's, never titled after someone else"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Split from director-journal-one-story (its first done-when line). Over two played years the Journal opened chapters on other people's filings and oaths ('Commissioner') and on a stranger's birth ('Oscar Roy'), so chapters were titled after someone else (lane 3 path 9).

**Rules.** Lane 3 path 9: no chapter titled after someone else. Rows hold the rule (data), not the code.

**Done when.** In two drawn places over two played years (buildBenchWorld), no chapter after the first opens on another person's filing or oath, and no chapter title is another person's name; others' filings and oaths are told inside the player's chapters; src/director/journal-story.test.ts shows it with place, seed and record ids, and fails without the change.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, src/english/journal-words.ts, src/director/journal-story.test.ts

**Notes.** Filed by Lane 3 (Nov 4); built on lane3/journal-story.
