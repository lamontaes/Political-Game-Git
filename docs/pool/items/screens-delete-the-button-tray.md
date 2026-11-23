---
id: screens-delete-the-button-tray
title: "Buttons sit on the panel: delete the framed button tray everywhere"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: screens lane (Nov 23)
pr:
blocked-on:
source: the owner's playthrough of Nov 23, rows P33 and P37 (docs/coordination/playtest/2026-11-23-1.md)
after:
lead: play-first
model: sonnet
effort: medium
root: none
---

**What.** Rows of buttons drew a recessed, framed bar around themselves: Announce and Sim to Jun 27 on the race screen showed as a wide box when the two buttons wrapped. The owner's Nov 5 rule is "no boxes".
Seen: Politics > Elections (race screen) and the Campaign tab's "Go out on the trail", the Issues repeal row, and measures.

**Cause.** Found in code: `buttonTray()` in `src/bench/ui/button.mjs` made a `.tray` and `ui/screen.mjs` gave a part's actions `.record-actions`; both were styled in `src/bench/play.css` (a dark gradient, a brass border, an inset shadow). Five calls in `src/bench/play.mjs` used it. The Nov 5 rule replaced the look in the docs but the code was never deleted and nothing failed when a screen used it.

**Fix.** Delete `buttonTray`, the `.tray` and `.record-actions` style and every reference; those rows use `buttonRow` (`.acts`), so buttons sit on the panel. A check plays a life and fails any Politics tab whose row of buttons draws a border, inset shadow or background of its own.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the tray function and its style go in the same change. One engine per mechanic: one button row.

**Done when.** A second session opens each Politics tab in a drawn place and sees no framed or recessed bar around any row of buttons, with Announce and Sim to a day on the race screen still working.

**Waits on.** Nothing. Long game's guard for a framed box in a framed panel starts after this lands.

**Files.** src/bench/ui/button.mjs, src/bench/ui/screen.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/no-button-tray.browser.mjs

**Notes.** Lead's split, Nov 23: Screens takes the deletion; Elections checks Announce and Sim after it lands; Long game takes the guards.
