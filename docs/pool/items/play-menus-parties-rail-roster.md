---
id: play-menus-parties-rail-roster
title: "Parties shows the district map on a plate, your party beside it, and each party's officeholders as face cards on a rail"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: cto/menus-parties
pr: #6873
blocked-on:
milestone: play-first
source: owner, Oct 29 ("redesign all the menu screens... buttons sitting there but without a railing")
claimed-at: 2026-10-30T02:31:35.112Z
---

**What.** Politics → Parties drew the district map, then the parties to join as loose buttons that wrapped onto several lines, then each party's officeholders as rows in a grid of plates, one of them without a title. Joining a party sent the player back to Government, away from the membership it had just made, and two browser checks still looked for the old rows and for Join on the Government tab. This item puts the map and its key on a plate, the player's party (or the parties to join, in a tray) beside it, and each party's officeholders as face cards, one party at a time on the tab rail, paged; joining stays on Parties.

**Rules.** Screen to mock: the screen uses the shared kit parts (plate, tray, tab rail, member card, pager, split screen), never a one-off renderer. No hand-written player text: how your views fit a party is said in the controls' words, never a figure. Replace, never layer: the grid of party rows is deleted.

**Done when.** In a drawn place at 1440 by 900, named with its seed, the parties-map browser check finds the map, its legend and officeholder face cards, and the party browser check joins a party from the Parties tab and sees the membership with how the views fit in words, with nothing scrolling; screenshots land in `docs/play-first/shots/play-menus-parties-rail-roster/`.

**Time box.** 1 hour, Opus (CTO).

**You will see.** Parties with the map on the left, your party on the right, and each party's officeholders as faces under a rail of party tabs.

**Screenshot.** Parties at 1440 by 900 from a drawn place.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json, src/bench/parties-map.browser.mjs, src/bench/party.browser.mjs

**Notes.** Filed by the CTO, Oct 30 02:50, the seventh screen of the menu redesign. Read: OWNER-DECISIONS Oct 29 22:45 and 23:00; searched the pool: parties screen, join party (no twin).
