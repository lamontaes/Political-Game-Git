---
id: screens-calendar-entry-overflows
title: "A long calendar entry runs past its row in some places"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** no-scroll.browser.mjs on a drawn life in Bountiful, Utah (Oct 28) failed with 'start · calendar: span.what over by 16px': one day-list entry's text runs 16px past its row on the first day. The same check passed in Stovall, North Carolina.

**Rules.** No scrolling or clipped text on any screen; one rule for all 56 places; words come from the calendar bank.

**Done when.** no-scroll.browser.mjs passes on five drawn places including one whose calendar has a long entry, with each place and seed named in the PR, and the long entry wraps inside its row in a screenshot.

**Files.** src/bench/play.mjs, src/bench/play.css

**Notes.** TODO
