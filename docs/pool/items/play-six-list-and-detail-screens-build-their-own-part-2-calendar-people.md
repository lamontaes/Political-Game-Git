---
id: play-six-list-and-detail-screens-build-their-own-part-2-calendar-people
title: "Calendar and People on the one list-beside-detail part"
area: play
kind: cleanup
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-play-six-list-and-detail-screens-build-their-own-part-2-calendar-people
pr: #8819
after: play-six-list-and-detail-screens-build-their-own-part-1-journal-patch-notes
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: split from play-six-list-and-detail-screens-build-their-own in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T13:27:30.705Z
merged-at: 2026-11-11T15:03:44.848Z
---

**What.** The Calendar and People screens each build their own list-beside-detail layout. Move both onto `rosterScreen` with the same rows and words as before, and delete their old builders and styles. Nothing a player can do or read changes. Every row must still open its detail on a click.

**Cause.** Found in code: src/bench/ui/calendar.mjs and `peopleScreen` in src/bench/ui/people-screen.mjs build their own layouts and do not call `rosterScreen` (src/bench/ui/roster-screen.mjs) from src/bench/play.mjs.

**Fix.** Rewrite both as callers of `rosterScreen`, keeping the Calendar's rows and the People groups and detail exactly, and delete the old builders, styles and browser-check selectors (src/bench/calendar.browser.mjs and the People checks are updated in the same change).

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: each screen moved onto the shared part loses its own builder, styles and browser-check selectors in the same change, and the PR body counts the functions and style rules removed. One engine per mechanic: one screen renderer per menu type (owner, Oct 27, AGENTS.md). The player's screens keep every control and every word they have today (slim-down: no change to what the game does).

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and takes a screenshot at 1440x900 of the Calendar and People with one row chosen, each set beside a screenshot of the same screen taken on the commit before the change in the same place and seed. The rows, detail and words are the same, every row opens its detail on a click, and the old builders and styles are gone from the code.

**Waits on.** play-six-list-and-detail-screens-build-their-own-part-1-journal-patch-notes

**Files.** src/bench/ui/calendar.mjs, src/bench/ui/people-screen.mjs, src/bench/ui/roster-screen.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/calendar.browser.mjs
