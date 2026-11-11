---
id: screens-calendar-entry-overflows
title: "A long calendar entry runs past its row in some places"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** no-scroll.browser.mjs on a drawn life in Bountiful, Utah (Oct 28) failed with "start · calendar: span.what over by 16px": one day-list entry's text runs 16px past its row on the first day. The same check passed in Stovall, North Carolina. The entry is a span.what inside a calendar entry, styled by the .calendar-entry .what rules in src/bench/play.css, and which entry runs long and why its row does not wrap it is not yet known, so the first step is to reproduce it on the Bountiful, Utah draw.

**Cause.** Needs cause. Looked at src/bench/play.css lines 1745 to 1790: the day-list entry is a grid whose text column is minmax(0, 1fr), and the rule .calendar-entry .what sets only text-align, with no wrapping rule; this is a likely but unreproduced cause, and the long entry was not identified on the Bountiful, Utah draw.

**Fix.** None until the cause is found.

**Time box.** 2 hours to reproduce the overflow and name the entry.

**Rules.** No scrolling or clipped text on any screen. No hand-written player text: the entry's words come from the calendar bank, so the fix wraps the existing words inside the row and never shortens the wording in code. One rule, all 56 places: the check passes on every drawn place, not only the one that failed.

**Done when.** A second session runs no-scroll.browser.mjs on five drawn places, including Bountiful, Utah and one whose calendar has a long entry, with each place and seed named in the PR, and sees every run pass. A screenshot shows the long entry wrapping inside its row, and the cause is named by the entry's record and the rule in src/bench/play.css.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/no-scroll.browser.mjs

**Notes.** TODO
