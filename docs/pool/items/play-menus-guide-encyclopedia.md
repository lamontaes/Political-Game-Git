---
id: play-menus-guide-encyclopedia
title: "The Guide is an encyclopedia page: term cards on a plate, the chosen term's article beside them; Government's leader posts are underlined terms again"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone: play-first
source: owner, Oct 29 ("So they're not blocks of text anymore with random buttons")
---

**What.** The Guide printed its thirty-eight civic terms as gold headings over lines of text down the bare panel, and the panel scrolled. When Government became member cards (#6832), a leader's post stopped being an underlined Guide term, so the glossary's hover meaning and its way into the Guide were lost there, which the guide-menu check caught. This item makes the Guide an encyclopedia page, the terms as cards on a plate paged two across and the chosen term's article beside them with the search narrowing both, and underlines a leader's post on a member card again.

**Rules.** Screen to mock: the Guide uses the shared kit parts (plate, pager, list entry, split screen), never a one-off renderer. No hand-written player text: every term, meaning and article comes from the guide records and every label from the controls words. Replace, never layer: the folded list of headings is deleted.

**Done when.** In a drawn place at 1440 by 900, named with its seed, the guide-menu browser check hovers a leader's underlined post on Government and reads its meaning, then opens the Guide from the rail and finds at least ten term cards, with the panel not scrolling; screenshots land in `docs/play-first/shots/play-menus-guide-encyclopedia/`.

**Time box.** 1 hour, Opus (CTO).

**You will see.** The Guide as cards of civic terms with the chosen term's full article beside them.

**Screenshot.** The Guide before and after at 1440 by 900.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/member-card.mjs, src/bench/data/controls.json, src/bench/guide-menu.browser.mjs, src/bench/politics-people.browser.mjs

**Notes.** Filed by the CTO, Oct 30 03:00, the ninth screen of the menu redesign. Read: prior-rulings/screens.md ("Glossary underlines with 'Mark as learned' MUST ship"); OWNER-DECISIONS Oct 29 22:45; searched the pool: guide screen, glossary (no twin).
