---
id: play-menus-journal-shared-look
title: "Journal follows its mock: one cream page of story, paged by chapter"
area: play
lead: play-first
kind: feature
priority: 2
size: S
status: done
claimed-by: play-first/play-menus-journal-shared-look
pr: #6910
blocked-on:
milestone: play-first
source: CTO, Oct 29 (every menu redesigned the way Government was)
claimed-at: 2026-10-30T02:40:00.000Z
---

**What.** Journal moves to its mock (the Nov 5 menu look): one cream page headed "My life" with the chapter's place and years, the story in indented paragraphs, and arrows to page by chapter.

**Rules.** Screen to mock (`screen-to-mock`); replace, never layer (the record-screen narrative rows for the journal are gone); the menu never scrolls as a page; no hand-written player text (labels in `controls.journal`).

**Done when.** `src/bench/journal-page.browser.mjs` shows the page, its chapter line and paragraphs inside the sheet with no scroll, and the arrows paging chapters; screenshots in `docs/play-first/shots/play-menus-journal-shared-look/`.

**Time box.** 1 hour, Sonnet.

**You will see.** The journal looks like its mock.

**Screenshot.** Journal, before and after.

**Files.** src/bench/ui/journal-page.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json

**Notes.** Stacked on #6844 (`cto/menus-person-card`). Travel follows.

**Menu look (owner, Nov 5).** Menu screens follow the look the owner locked on Nov 5 (dark see-through textured panel, no boxes, glowing hover, lit selection, portraits in light, data not sliders or bar graphs, no checkboxes); the CTO holds the clickable mock, and no menu is built until the owner approves its screen.
