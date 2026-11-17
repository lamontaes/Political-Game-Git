---
id: play-options-stays-over-scene
title: "A scene that comes due closes Options, so Quit to title is lost in the first minute of play"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/blockers-options-over-scene
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Screens on the crew line, Nov 17, 2026 (comment 6938406583 on issue 9747); the desktop smoke test fails on train/nov17, which blocks the owner's 11 a.m. Mac build
checked:
---

**What.** Pressing Escape as play starts opens Options, then the opening's scene comes due and closes it, so "Quit to title" is gone. The desktop smoke test does exactly this and fails on the train, which turns every package build red.
Seen: the train at 2df62063, the smoke test's steps in a browser (Screens), and seed 89b37e79-1a5b-48eb-94f1-fa6061dbe20a on the bench.

**Cause.** Found in code: src/bench/play.mjs `closeCards`, added by #9756 so a due scene is never hidden behind a card, closes any open sheet, Options included.

**Fix.** `closeCards` leaves Options open; the scene is staged under it and shows when Options closes, as before #9756. Every other card and menu still closes.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: the way out of the game (Options, Quit to title) stays reachable at every moment of play, and the smoke test's step is left as it is.

**Done when.** A second session starts a new game in a drawn place it writes down with its seed, presses Escape as play starts, waits for the opening's scene to come due, and clicks Quit to title: the title menu comes back, with a screenshot of Options over the scene.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/options-stays-over-scene.browser.mjs (new)

**Notes.** Filed and built by the Blockers lane, Nov 17. Follows #9756.
