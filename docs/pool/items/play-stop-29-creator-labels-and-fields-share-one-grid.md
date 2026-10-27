---
id: play-stop-29-creator-labels-and-fields-share-one-grid
title: "The creator's labels, fields and gender buttons line up on one grid and keep their size when picked"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: play-first/play-stop-29-creator-labels-and-fields-share-one-grid
pr: #6241
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T06:15:24.821Z
---

**What.** In the creator (Start a life) the "Gender (required)" heading is indented differently from "Your character"; the label column and the field column do not line up (the name fields sit right while the birthday sits left); and the chosen gender button grows wider and gets a gold corner tab, so the row changes size when you click. The owner: "Your character, gender required. Like, why is that off-center and stuff? Why is everything not lined up like a normal game? I still don't understand." This item puts every section heading, label and field on one left edge with one label column and one field column, and shows the chosen button with a state that does not change its size.

**Rules.** Serves LAW.md §10, The owner's read of the Oct 24 screenshots (the creator's fields line up; buttons are the same size) and LAW.md §1, Screens and menus. This is a game, not a spreadsheet: the creator should look like any game's. Replace, never layer: the widening-with-tab selected state is replaced by one that keeps the button's box.

**Done when.** In the creator in a drawn place at 1440x900 and 1024x768, a check in src/bench/creator-fields.browser.mjs reads bounding boxes and passes: every section heading and field label shares one left edge, the name fields and the birthday fields share one left edge, and clicking each gender button changes no button's width or height, shown by a screenshot with Male picked. The check fails on main's creator.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Everything in the creator lines up down one edge like a normal game's form, and clicking Male or Female changes only the button's look, not its size.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css, src/bench/play.html, src/bench/creator-fields.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "Why is everything not lined up like a normal game? I still don't understand." Related and not duplicated: play-first-03-creator-date-fields-aligned (the three date fields and field boxes; implementation merged, item open for the installed-build check) and play-first-17-buttons-same-size (one size per row; PR open). This item adds the label column and the picked state those two do not cover. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
- Merged Oct 27 in PR #6241; awaiting the owner's installed-build check.
