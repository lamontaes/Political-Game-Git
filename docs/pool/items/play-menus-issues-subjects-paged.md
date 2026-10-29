---
id: play-menus-issues-subjects-paged
title: "Issues shows one subject at a time on a rail, its law cards paged in a plate, and every subject reachable"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: claimed
claimed-by: cto/menus-issues
pr:
blocked-on:
milestone: play-first
source: owner, Oct 29 ("redesign all the menu screens"); CTO's menu sweep the same night
claimed-at: 2026-10-29T23:33:20.089Z
---

**What.** Politics → Issues laid fourteen subjects of law cards into CSS columns that ran off the right edge of the panel, so in most places only the first two or three subjects could be seen and the rest could not be reached at all. The owner asked for every menu to be redesigned like Government (Oct 29, 22:45) with tabs on a rail and nothing scrolling. This item puts the subjects on the tab rail, shows one subject's law cards at a time paged inside a framed plate, keeps the search, and lays each law's own page out on plates.

**Rules.** Screen to mock: the cards follow the Oct 14 Issues mock and the shared kit parts (rail, plate, pager), never a one-off renderer. Replace, never layer: the column layout for Issues is deleted. One rule, all 56 places: subjects and cards come from the law records of the drawn place, never a named state.

**Done when.** In a drawn place at 1440 by 900, named with its seed, a browser check opens every subject on the Issues rail and finds its cards with the panel not scrolling, collects every card on every page, opens a law's page, and passes; screenshots beside the mock and the old screen land in `docs/play-first/shots/play-menus-issues/`.

**Time box.** 2 hours, Opus (CTO).

**You will see.** Issues with every subject on a rail; click one and its laws appear as cards on a plate, with arrows when there are more.

**Screenshot.** Issues before and after at 1440 by 900 from a drawn place, beside the mock.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/split-screen.mjs, src/bench/ui/list-screen.mjs, src/bench/ui/button.mjs, src/bench/issues-law.browser.mjs, src/bench/issues-levels.browser.mjs

**Notes.** Filed by the CTO, Oct 29 23:55, from the all-menus screenshot sweep (subjects past the third ran off the panel). Read: OWNER-DECISIONS Oct 29 22:45 and 22:15; searched the pool: issues, columns, subjects (no twin).
