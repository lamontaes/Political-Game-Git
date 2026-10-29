---
id: play-stop-45-talk-history-set-apart
title: "Earlier lines in a talk are set apart from the line being said now"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6188
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** In a talk the earlier lines stay in the box in small gray above the new line, with nothing between them, so a reply from a minute ago reads as part of what is being said now. The owner, on the Kendall scene: "I think that's supposed to be the chat history. It needs to be delineated, different color, separated, etc." This item draws the history as its own block (a rule or gap, a quieter color and weight, speaker named) above the current line, so the current speaker and line are unmistakable.

**Rules.** Serves LAW.md §4, Scenes and conversations and LAW.md §1, Screens and menus. This is a game, not a spreadsheet. Replace, never layer: one history style, not a second beside the old gray text.

**Done when.** In a drawn place in a household talk after two exchanges, a browser check reads the talk box and passes: the history is a separate element from the current line, with a different computed color and a border or gap between them, and the current line is the last block; shown by a screenshot at 1440x900 after the second exchange. The check fails on main.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** In a talk, what was said before sits in a quiet, separate block above the line being said now.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/play.html, src/bench/talk-history.browser.mjs (new)

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "The chat history thing that popped up needs to be delineated either with a different color or with a line or something." New owner instruction in playtest; CTO to record in OWNER-DECISIONS.md. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
Merged Oct 27 in PR #6188; awaiting the owner's installed-build check
