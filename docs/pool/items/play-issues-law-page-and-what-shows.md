---
id: play-issues-law-page-and-what-shows
title: "Issues looks like a game menu, a law opens a page that explains it, and the player chooses what the list shows"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:40 UTC (second batch)
lead: play-first
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0, on Politics, Issues: "I kind of see the vision here, though. I don't like how it's just laid out and a bunch of cards. Again, this doesn't look like a real game menu. I like the idea of being essentially what amounts to the game laws or the issues... But I click on it and then it gives me no information about it. Give me options for what shows." Opening Child access prevention shows only "In force: Territory law, No, since July 1, 2024". A law's page should say in plain words what it does, which level has it, who it reaches here, when and how it passed, and how people and parties feel about it, from the records. The CTO reads "options for what shows" as controls for the list (by level, in force or not, by subject), and the issue's possible positions on its page.

**Rules.** Screen to mock: Issues is redrawn the way Government was (Oct 29 menus ruling), from the shared parts, and its mock goes in the PR. No hand-written player text: the law's explanation comes from the English engine and the law's record. An effect is a read, not a record: who it reaches reads the law engine's own reach records.

**Done when.** In a drawn place (named with seed), Issues shows a menu-style list with filters for level, in force and subject; opening a law shows its plain-words summary, level, date, how it passed, who it reaches here and views on it, each from a record id named in the PR; screenshots at 1440x900 before and after.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Clicking a law in Issues tells you what it does and who it affects, and you can choose which laws the list shows.

**Screenshot.** Issues and one law's page, before and after.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/bench/play.css

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, second batch (Nov 1, 22:40 UTC, five screenshots, a game in the U.S. Virgin Islands). Read: OWNER-DECISIONS (Oct 29 menus redesigned the way Government was; Oct 29 Political Process baseline; one history), the pool for twins.
