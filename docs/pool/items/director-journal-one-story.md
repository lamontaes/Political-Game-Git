---
id: director-journal-one-story
title: "The Journal reads as one story: no chapter heading per person, each line joined to the one before it"
area: director
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: director
source: added with npm run pool -- add
---

**What.** Owner, Oct 28, from the Journal in v0.59.0: 'saying I started school, and then a random person became county assessor. No. It needs to read like a story. There's no reason to have separate headings for your son Jasper.' In src/director/journal.ts a turn row (a child, a race) opens a chapter titled by its record, which is the per-person heading. Another person's turn, such as a friend taking office, is told as a bare line about them. The memoir is one dramatized story (owner, Oct 14, Oct 26, Oct 27).

**Rules.** Chapters are stretches of the life by time and place, never titled by another person. Every line in date order is joined to the one before it by cause (its record names the earlier record), feeling (the person's mood moved the same way) or time. Another person's turn is told only as what it meant to the player, from the tie and whether they knew of it. The words lead owns the joining words and the meant-to-me lines (data/english/parts/journal.json); the History session owns the past records (#6452); one PR for the grouping and one for the lines. No hand-written player text.

**Done when.** In a played world (buildBenchWorld) with a drawn 35-year-old's Journal in two seeds named in the PR body, no chapter title names another person, every line after the first carries a cause, feeling or time link to the line before it with the record ids that link them, and another person's turn is told through the player's tie, shown by a test and the Journal text in the PR body.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, src/director/journal.test.ts

**Notes.** TODO
