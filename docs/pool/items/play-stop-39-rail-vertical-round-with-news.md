---
id: play-stop-39-rail-vertical-round-with-news
title: "The menu icons are a vertical column of round icons above your card, with News among them"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6185
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On v0.34.0 the menu icons are a horizontal row of six small square keys above the player card (#rings is a flex row of 40-pixel squares in src/bench/play.css), and there is no News icon (the row is Journal, Calendar, Money, Politics, People, Travel). The owner's ruling and the Oct 14 mock are a straight vertical column of round icons, bottom left, directly above the card, names on hover, with News as its own icon and Options moved to the Esc key. This item builds the rail that way: seven round icons in a column in the order Journal, Calendar, Money, Politics, News, People, Travel, a News icon drawn in the Kit 13 line style, a dot on News while a story is unread, and no Options icon. It is the rail half of play-menu-shell-oct20.

**Rules.** Serves LAW.md §1, Screens and menus (the play screen: "The menu is a straight column of round icons, bottom left, above the player card; the name shows on hover. No radial menu," MOCKS:24; the menu structure, OD:76, names the seven entries and moves Options to Esc; alerts include a dot on a rail icon for something unread). This is a game, not a spreadsheet. Replace, never layer: the horizontal row of squares is deleted, not kept beside the column.

**Done when.** In a drawn place on the play screen at 1440x900, a check in src/bench/panels.browser.mjs reads the rail and passes: seven icons share one x and their y strictly increases downward in the order Journal, Calendar, Money, Politics, News, People, Travel; each icon's width equals its height with a fully round border; the name shows on hover; News shows a dot while an unread story exists and not after it is read; there is no Options icon on the rail; and the player card covers none of the icons, shown by a screenshot with the mouse on one icon. The check fails on main's row of squares.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** A tidy column of round icons stands bottom left above your card, News is one of them, and the names appear when you hover.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.html, src/bench/play.css, src/bench/play.mjs, src/bench/data/controls.json, src/bench/panels.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). No owner words on the rail in this sitting; the CTO read the build against OD:76 and the Oct 14 mock (docs/ui/mocks/screens-2026-10-14/shots/play.png). Split from play-menu-shell-oct20 (size L; its in-pr claim points at draft PR #5180, which is not menu work, so the CTO should set it open). The Menu list's subheadings are play-stop-40. Options moving to Esc and the old Menu panel leaving are the rest of play-menu-shell-oct20. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
