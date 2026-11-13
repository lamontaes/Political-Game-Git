---
id: play-news-briefs-print-over-each-other
title: "A long brief in News is printed over the brief below it"
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/fable-b-news-briefs-fit
pr: #8813
after:
blocked-on:
lead: screens
model: fable
effort: low
root: rc10-screens-keep-own-facts
source: Seen helper C's pictures of News in two drawn places on Nov 11, 2026 (pull request #8439), then the lead's reading of the news board
checked:
claimed-at: 2026-11-11
merged-at: 2026-11-11T14:39:42.331Z
---

**What.** The Briefs column in News gives every brief a row of one fixed height. A brief longer than three lines (a week of meetings, a police log, a home sale with its price) runs out of its row and is printed on top of the brief below, so neither can be read. A second session saw it on Nov 11 in Pine Creek, Montana and Mesquite, Nevada (seed 7ebba0a9-ae07-4014-8ea8-c4629e7e1c83), where the paper held several long briefs; Greenville, Rhode Island, with short ones, fit. Seen: News at 1440x900 on a day the local paper holds three or more long briefs, where each brief is whole and the column scrolls inside its own box.

**Cause.** Found in code: `newsBoard` in src/bench/ui/news-board.mjs draws the briefs through the shared long-list box (`pager`, src/bench/ui/pager.mjs) with `rowHeight: 86` and without `growRows`. The pager's rows are then exactly 86 pixels (`gridAutoRows`), and a paragraph taller than that overflows into the next row. The pager already has the answer, written for the roster: `growRows` makes a row grow when its text wraps, "never clips or overlaps", and the box scrolls.

**Fix.** Pass `growRows: true` for the briefs in src/bench/ui/news-board.mjs. No new part, no new style. The browser check src/bench/news-clicks.browser.mjs gains a paper with six long briefs and fails when any brief's words are taller than its row; its first wait is made to name one story, since a front page with three stories made it fail before it began.

**Time box.** 1 hour.

**Rules.** Replace, never layer (owner, Oct 14): the screen uses the one long-list box's own rule for long rows and adds no second way to size a row. No hand-written player text in code: no word on the page changes. One rule, all 56 places: the check's own paper is an edge-case proof of the look, and the drawn place's News is read before and after.

**Done when.** A second session, in the running game on main at 1440x900, opens News in a drawn place it writes down with its seed on a day the local paper prints three or more briefs (dev mode's date jump brings such a day), and every brief is whole, none printed over another, with the column scrolling inside its box. `node src/bench/news-clicks.browser.mjs` passes on a fresh bench, and fails on the long-briefs case when `growRows` is taken out, as a screenshot of each shows.

**Waits on.** Nothing.

**Files.** src/bench/ui/news-board.mjs, src/bench/news-clicks.browser.mjs

**Notes.** Written and built by the lead (Fable B), Nov 11. Not in this item: each brief says its subject twice ("Rocha Manufacturing opens. Rocha Manufacturing is open for business."), which is the brief writer's words and goes to a Words builder; and one town's paper printing another town's council meeting (Greenville's paper, the Smithfield Town Council), which needs its cause.
