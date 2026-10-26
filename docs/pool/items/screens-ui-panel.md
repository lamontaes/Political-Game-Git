---
id: screens-ui-panel
title: "One shared panel part in src/bench/ui"
area: play
kind: cleanup
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: screens
milestone: play-first
---

**What.** The owner ruled on Oct 26 that the play screen's controls come from one shared set, not one-off copies in play.mjs. This is the first part: how a panel opens and closes, and the close control every panel carries. Today the sheet, the person card and the news reader each hand-write their own close button in play.html, and play.mjs holds its own show(). They move to src/bench/ui/panel.mjs, and the old copies are deleted. Looks and behavior do not change.

**Rules.** Serves LAW.md section 1 (one set of shared controls, owner Oct 26). Replace, never layer: the three hand-written close buttons and the local show() are deleted in the same change. Screens follow the mock: nothing about the look of a panel changes here.

**Done when.** The three close buttons in play.html and the show() in play.mjs are gone and every panel opens through ui/panel.mjs; the card, character and no-scroll browser checks pass in a drawn place; a before and after screenshot at 1440x900 of the People sheet shows the same panel and close control, with place and seed written under each.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The same windows with the same close X, now built by one shared part.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/ui/panel.mjs, src/bench/play.mjs, src/bench/play.html, src/bench/server.ts

**Notes.** Work order docs/work-orders/lead-screens-2026-10-26.md, part 1.
