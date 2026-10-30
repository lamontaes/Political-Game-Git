---
id: play-menus-calendar-shared-look
title: "Calendar follows its mock: day tiles with icons, the day on a plate, Coming up paged"
area: play
lead: play-first
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: play-first/play-menus-calendar-shared-look
pr: #6857
blocked-on:
milestone: play-first
source: CTO, Oct 29 (every menu redesigned the way Government was; MOCKS calendar.png)
claimed-at: 2026-10-30T02:00:00.000Z
---

**What.** Calendar moves to its mock (`docs/ui/mocks/screens-2026-10-14/shots/calendar.png`) on the shared parts: compact day tiles with a small icon for each kind of thing on the day, the chosen day on a framed plate (weekday, date, how far off, each thing with its icon, Go to this day), and Coming up paged inside its box with the shared pager.

**Rules.** Screen to mock (`screen-to-mock`); replace, never layer (the old tile lines, the scrolling list and the skip icon are deleted); the menu never scrolls as a page; no hand-written player text (labels in `controls.calendar`).

**Done when.** The calendar check (`src/bench/calendar.browser.mjs`) shows the three parts inside the panel, the chosen day's plate listing what its tile marks, and Go to this day moving the clock; screenshots in `docs/play-first/shots/play-menus-calendar-shared-look/`.

**Time box.** 3 hours, Sonnet.

**You will see.** The calendar looks like its mock.

**Screenshot.** Calendar today and a chosen day, before and after.

**Files.** src/bench/ui/calendar.mjs, src/bench/play.css, src/bench/data/controls.json, the three browser checks that read the calendar.

**Notes.** Stacked on #6844 (`cto/menus-person-card`). Journal and Travel follow as their own items. The check's last leg (answering a stop after the jump, then Week) times out on the unchanged branch too; it is not from this change.
