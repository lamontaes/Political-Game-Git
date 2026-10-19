---
id: words-housing-moved-lines
title: "A household's move into a new home has journal and scene words from the English engine"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The director now scores a household's move into a new home (`housing.moved`) as a moment, but the journal and the scene bank have no words for it, so a watched person's move shows no line and no scene. Add a journal row for `event:housing.moved` with an own line and a line for someone else's move, and a scene role for it, with the words as authored English-bank pieces graded through the civic-prose process. In a place with rent stabilization, the line for a lease renewal in a new building carries the capped rent and its law id.

**Rules.** No hand-written player text: every line is an English-engine bank piece with its grounding facts (the project, the old and new rent), never typed into the director. The chain is the acceptance: follow one move from the housing record to the moment, the journal line and the scene, by record id.

**Done when.** In a one-year `buildBenchWorld` run in a drawn place where new rentals are built, a watched person's `housing.moved` record id has a moment, a journal line and a scene that cite it, and `src/director/journal.test.ts` and the English bank tests name the place, seed and record id; the owner plays it: a move into a new home appears in the journal.

**Files.** src/director/data/journal-rows.json, src/director/data/scene-rows.json, data/english/parts/journal.json, data/english/parts/scene-words.json

**Notes.** Split from world-new-homes-moves-read Oct 19. In the Oak Grove, Tennessee year (seed 118758c6) the housing engine emitted no `housing.moved`, since a move needs a finished new unit; pick a place with construction when proving it.
