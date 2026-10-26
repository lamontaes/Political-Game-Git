---
id: screens-ui-tab
title: "One shared tab part in src/bench/ui"
area: play
kind: cleanup
priority: 1
size: S
status: claimed
claimed-by: claude/screens-ui-tab
pr:
blocked-on:
source: added with npm run pool -- add
lead: screens
milestone: play-first
claimed-at: 2026-10-26T20:36:37.719Z
---

**What.** The owner ruled on Oct 26 that the play screen's controls come from one shared set. This is the fifth part: the tab. Today play.mjs builds the sheet tabs, the Government level tabs, the People group tabs and the News outlet tabs by hand, each with its own code to mark the chosen one. They move to src/bench/ui/tab.mjs as makeTab and chooseTab, and the hand-written tab code is deleted. Looks and behavior do not change.

**Rules.** Serves LAW.md section 1 (one set of shared controls, owner Oct 26) and the screen-to-mock skill. Replace, never layer: the four hand-built tab bars and the three copies of the chosen-tab toggle are deleted in the same change. Nothing about how a tab looks changes here.

**Done when.** No `className: "tab` or `.className = "tab"` remains in play.mjs; the sheet, Government level, People group and News outlet tabs are built through makeTab and marked through chooseTab; the calendar, news, sheets, no-scroll and character browser checks pass in a drawn place, and people and politics fail the same way on clean main; a before and after screenshot at 1440x900 of People and Politics shows the same tabs, with place and seed written under each.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The same tabs on every screen, built by one shared part.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/ui/tab.mjs, src/bench/play.mjs

**Notes.** Work order docs/work-orders/lead-screens-2026-10-26.md, part 5. Stacked on claude/screens-ui-card (#6182), then #6181, #6179, #6178; merge those first.
