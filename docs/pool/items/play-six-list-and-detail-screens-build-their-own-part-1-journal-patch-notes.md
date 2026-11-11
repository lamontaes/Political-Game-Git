---
id: play-six-list-and-detail-screens-build-their-own-part-1-journal-patch-notes
title: "Journal and Patch notes on the one list-beside-detail part"
area: play
kind: cleanup
priority: 2
size: S
status: done
standard: 2
claimed-by: claude/pool-play-six-list-and-detail-screens-build-their-own-part-1-journal-patch-notes
pr: #8488
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: split from play-six-list-and-detail-screens-build-their-own in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:42:06.673Z
merged-at: 2026-11-11T13:25:38.128Z
seen-by: "Fable B (lead; not the builder)"
seen-at: 2026-11-11T15:12:19.644Z
---

**What.** Patch notes and the Journal each build their own list-beside-detail layout. Move both onto `rosterScreen`, the part Campaign, Elections, Parties and Issues already call, so a player sees the same list at the left and the chosen entry at the right on all of them. Nothing a player can do or read changes.

**Cause.** Found in code: `patchNotesScreen` and `journalScreen` in src/bench/ui/strips.mjs (lines 365 and 423) build their own chapter list and page, while `rosterScreen` in src/bench/ui/roster-screen.mjs is the shared part; Patch notes and Journal are not among its callers in src/bench/play.mjs.

**Fix.** Rewrite `patchNotesScreen` and `journalScreen` as callers of `rosterScreen` (groups for the list, a render for the page), keep their rows, words and chosen-entry behavior, and delete their old list builders, styles and the browser-check selectors that named them. Confirm here that `splitScreen` is a layout, not a second list part.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: each screen moved onto the shared part loses its own builder, styles and browser-check selectors in the same change, and the PR body counts the functions and style rules removed. One engine per mechanic: one screen renderer per menu type (owner, Oct 27, AGENTS.md). The player's screens keep every control and every word they have today (slim-down: no change to what the game does).

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and takes a screenshot at 1440x900 of Patch notes (from the title) and the Journal with one chapter chosen, each set beside a screenshot of the same screen taken on the commit before the change in the same place and seed. The rows, detail and words are the same, every row still opens its detail on a click, and a search finds no list builder left in `patchNotesScreen` or `journalScreen`.

**Waits on.** Nothing.

**Files.** src/bench/ui/strips.mjs, src/bench/ui/roster-screen.mjs, src/bench/play.mjs, src/bench/play.css

**Notes.** Seen in the game (2026-11-11, Fable B (lead; not the builder)): Shonto, Arizona, seed fb-seen-8488, main c9cfd369eb: Patch notes from the title and the Journal with its chapter chosen, at 1440x900, each beside the same life on the commit before the change (36cd414682). Both are a list beside its detail; the rows and the detail sit where they did; seven of seven other builds opened their notes on a click; the Journal's one chapter shows its text. Words differ only where later words changes rewrote them. Both screens are built by the one roster part and hold no list builder of their own.
