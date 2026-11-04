---
id: director-journal-joining-words
title: "The Journal's joining words: a line opens on why or how long after the line before"
area: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Split from director-journal-one-story, after director-journal-line-links: a line whose link is a cause opens on a joining clause from the journal bank ('Because of that, ...', 'So, ...'), and one that comes a month or more after the line before opens on the time that passed ('Three months later, ...'). A line that says its own time takes none.

**Rules.** No hand-written player text: the clauses are bank pieces (memoir fields joinCause and joinLater in data/english/parts/journal.json). The month threshold is the span bank's own shortest band, not a new number.

**Done when.** In two played worlds (buildBenchWorld, two years) named with place and seed, joined lines appear only on cause links or month-plus gaps, each ends on the line's own wording (line.plain), and the Journal tests read the plain wording.

**Files.** src/director/journal.ts, src/english/journal-words.ts, data/english/parts/journal.json, src/director/data/journal-rows.json

**Notes.** Lane 3, Nov 4: built on lane3/journal-joins, after #7228.
