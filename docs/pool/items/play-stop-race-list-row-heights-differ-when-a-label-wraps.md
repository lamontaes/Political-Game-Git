---
id: play-stop-race-list-row-heights-differ-when-a-label-wraps
title: "The list of races: buttons in one row differ in height when a seat label wraps (Virgin Islands at-large legislator seats)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Merger 7, Oct 27 (gating #6350)
lead: play-first
milestone: play-first
---

**What.** buttons.browser.mjs fails on some draws: in Charlotte Amalie, U.S. Virgin Islands (seed 4aafd390-c9b4-489c-85a8-f1e2de3fb41d) the filing race list's 'Talk box' buttons differ in height because a long label ('Legislator (At-large)' with the date and number) wraps on some rows. Seen by Merger 7 after #6350 merged (it fixed the empty Travel and Politics panels but not this).

**Rules.** Serves LAW.md §1, Screens and menus. Replace, never layer: the shared row part is fixed, no second renderer beside it. Use the shared menu parts under src/bench/ui, never a new renderer; the fix is the shared row's min-height or one-line label rule, not per-screen CSS. Check in a drawn place and in the Virgin Islands seed.

**Done when.** buttons.browser.mjs passes 10 of 10 fresh runs on a restarted bench, including the seed above; a before/after screenshot of the race list in that place.

**Files.** src/bench/play.css, src/bench/ui/menu.mjs, src/bench/buttons.browser.mjs

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** In the list of races, every button in a row is the same height even when a seat's label is long.

**Screenshot.** Before and after, from a drawn place (Charlotte Amalie, U.S. Virgin Islands, seed 4aafd390-c9b4-489c-85a8-f1e2de3fb41d), in the PR body.

**Notes.** Found by Merger 7 gating #6350, Oct 27.
