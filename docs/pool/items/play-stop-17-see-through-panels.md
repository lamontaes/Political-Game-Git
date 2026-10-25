---
id: play-stop-17-see-through-panels
title: "Menu, news and person panels are see-through, so the room shows through the text"
area: play
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-play-stop-17
pr:
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T17:42:47.213Z
---

**What.** On the v0.22.10 release the News panel, the person card and every menu screen (Calendar, Who you are, People, Politics) are drawn over the scene with the scene showing through. On the first evening the living room, its ceiling fan and four people sit behind the news text and the Politics lists, which makes small text hard to read. I expected a solid panel when I open a screen to read it.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: a reading screen must be readable at a glance. Replace, never layer: one panel style, solid enough to read, instead of a second dimming layer over the scene.

**Done when.** The owner does the same steps on the next build and is not stopped: with the busiest backdrop of the first evening behind it, the News panel, a person card and Politics → Government are readable, with text contrast meeting the kit's check. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** News, a person card and Politics read cleanly over the busiest room, with the room no longer showing through the text.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:53 onward; screenshots 12, 13, 18, 20, 24. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.
