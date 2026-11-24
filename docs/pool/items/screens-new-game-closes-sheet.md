---
id: screens-new-game-closes-sheet
title: "New game closes a Patch notes or Options sheet opened over the title"
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #10297
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
merged-at: 2026-11-24T04:58:43.737Z
---

**What.** The owner, Nov 23 (P2), said: when I click new game, the patch notes still stay on top of it. A sheet opened from the title (Patch notes, Options, Saves) stays on screen when a front panel opens.
Seen: the title menu at 1440 by 900 with Patch notes open, then New game. Seen: the Patch notes sheet over the New game choices, before; the choices alone, after. Guards: title-patch-notes.browser.mjs

**Cause.** Measured: `node src/bench/title-patch-notes.browser.mjs` against `npm run bench` on main 7f04c334 with the notes open then New game: #sheet stays visible. src/bench/play.mjs frontPanel shows and hides the front panels but never calls closeSheet.

**Fix.** In frontPanel, call closeSheet when openTab is set. Extend title-patch-notes.browser.mjs to click New game with the notes open and assert #sheet is hidden.

**Time box.** 1 hours

**Rules.** Screen to mock: the patch notes close the moment New game opens, as the approved title mock shows. No hand-written player text: no new label is added; existing control names only.

**Done when.** A second session, in a drawn place and seed it names, opens Patch notes on the title, presses New game, and sees the notes close and the new-game choices show alone; title-patch-notes.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/title-patch-notes.browser.mjs
