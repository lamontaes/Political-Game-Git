---
id: play-six-list-and-detail-screens-build-their-own-part-3-travel-guide
title: "Travel and the Guide on the one list-beside-detail part"
area: play
kind: cleanup
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #8820
after: play-six-list-and-detail-screens-build-their-own-part-2-calendar-people
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: split from play-six-list-and-detail-screens-build-their-own in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
merged-at: 2026-11-11T15:29:54.495Z
---

**What.** Travel and the Guide each build their own list-beside-detail layout. Move both onto `rosterScreen` with the same rows and words, so every row opens its detail as before, and delete their old builders and styles. This is a cleanup with no change to what the game does. The browser checks that named the old classes are updated in the same change.

**Cause.** Found in code: `travelScreen` in src/bench/ui/travel-screen.mjs (line 27) and `guideScreen` in src/bench/ui/guide-screen.mjs (line 16) build their own layouts and do not call `rosterScreen` (src/bench/ui/roster-screen.mjs).

**Fix.** Rewrite both as callers of `rosterScreen`, keep the cards and guide pages exactly, delete the old builders and styles, and update the browser checks that named the old classes in the same change.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: each screen moved onto the shared part loses its own builder, styles and browser-check selectors in the same change, and the PR body counts the functions and style rules removed. One engine per mechanic: one screen renderer per menu type (owner, Oct 27, AGENTS.md). The player's screens keep every control and every word they have today (slim-down: no change to what the game does).

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and takes a screenshot at 1440x900 of Travel and the Guide with one row chosen, each set beside a screenshot of the same screen on the commit before the change in the same place and seed. The rows, detail and words are the same, every row opens its detail on a click, and the old builders and styles are gone.

**Waits on.** play-six-list-and-detail-screens-build-their-own-part-2-calendar-people

**Files.** src/bench/ui/travel-screen.mjs, src/bench/ui/guide-screen.mjs, src/bench/ui/roster-screen.mjs, src/bench/play.mjs, src/bench/play.css
