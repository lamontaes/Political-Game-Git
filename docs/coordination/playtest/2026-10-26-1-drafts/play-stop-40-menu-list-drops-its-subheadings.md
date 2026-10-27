---
id: play-stop-40-menu-list-drops-its-subheadings
title: "The menu list shows only its entries, with no line of description under each"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** The Menu panel lists Calendar, People, Politics, News, Journal, Who you are, Money and property, Jobs and study, Travel, Guide and Options, and under several of them a second line: "Today, what is next, and your time", "Who you know, and how", "Who governs where you are, at every level", "Published public records", "Work, school and training", "Where you are, where you can go", "What the words on the other screens mean". The owner: "Remove the subheadings from the menu. ... [Jobs and] study, travel, didn't approve any of those. They all need to be taken out." This item deletes the second line under every menu entry (the nd spans in src/bench/play.html and their style), so each entry is just its name.

**Rules.** Serves LAW.md §1, Screens and menus (OD:76: the menu names; "Actions start from people, places and scenes, not menu lists") and the No hand-written player text rule (the second lines are typed into play.html, not engine words). This is a game, not a spreadsheet. Replace, never layer: the description lines and their style are deleted, not hidden.

**Done when.** In a drawn place with the Menu open at 1440x900, a browser check reads every nav-item and finds only its name and no second line, and a test fails if play.html or play.css holds the description lines or their class again, shown by a screenshot of the open Menu. The entries themselves are not removed by this item (see Notes).

**Time box.** 1 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The Menu is a plain list of names with nothing written under them.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.html, src/bench/play.css, src/bench/panels.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "Remove the subheadings from the menu. ... [Jobs and] study, travel, didn't approve any of those. They all need to be taken out." New owner instruction in playtest; CTO to record in OWNER-DECISIONS.md. Reading to confirm with the owner: the log's transcription is broken, and "study, travel" most likely names the description lines under Jobs and study ("Work, school and training") and Travel ("Where you are, where you can go"). Travel stays as a rail entry per OD:76 and the Oct 14 mock ("Travel: Approved as is"), and Jobs and study is a tab of You per OD:76 ("Clicking your own portrait opens You, with Work and study as its second tab"); if the owner means the entries themselves, that is a new ruling for the CTO to record before any removal. Options and Guide in the list are play-menu-shell-oct20's. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
