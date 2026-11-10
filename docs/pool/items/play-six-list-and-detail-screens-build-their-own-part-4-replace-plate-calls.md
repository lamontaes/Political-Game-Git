---
id: play-six-list-and-detail-screens-build-their-own-part-4-replace-plate-calls
title: "Replace the 8 framed-plate calls with the strip section"
area: play
kind: cleanup
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: play-timeline-still-drawn-on-your-life-and-the-person-card
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: split from play-six-list-and-detail-screens-build-their-own in the pool redo, Nov 10, 2026
---

**What.** The play screen still calls the older framed plate 8 times beside the newer strip section 47 times, so two generations of panel sit side by side. Replace each `plate(` call with the strip section part and delete the plate part and its styles. The words, rows and order on each screen stay exactly as they are. Two of the eight calls hold a timeline that another item deletes.

**Cause.** Found in code: `plate(` is called 8 times in src/bench/play.mjs (lines 883, 1004, 3065, 3408, 3441, 3450, 3925 and 4879 on Nov 10) and defined in src/bench/ui/plate.mjs; `stripSection(` is called 47 times. Two of the calls (3441 and 3450) hold the timeline that play-timeline-still-drawn-on-your-life-and-the-person-card deletes.

**Fix.** Replace each remaining `plate(` call with `stripSection(` in the same words and order, delete src/bench/ui/plate.mjs and the framed-plate styles in src/bench/play.css, and update the browser checks that named the old classes.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: each screen moved onto the shared part loses its own builder, styles and browser-check selectors in the same change, and the PR body counts the functions and style rules removed. One engine per mechanic: one screen renderer per menu type (owner, Oct 27, AGENTS.md). The player's screens keep every control and every word they have today (slim-down: no change to what the game does).

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and takes a screenshot at 1440x900 of each screen that held a `plate(` call (the places are named in the Cause), each set beside a screenshot of the same screen on the commit before the change. The words and rows are the same, and a search finds no `plate(` in src/bench/play.mjs and no framed-plate rule in src/bench/play.css.

**Waits on.** play-timeline-still-drawn-on-your-life-and-the-person-card

**Files.** src/bench/play.mjs, src/bench/ui/plate.mjs, src/bench/play.css
