---
id: play-calendar-more-than-birthdays
title: "The calendar shows the player's own appointments and the town's dated events, not mostly other people's birthdays"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: play-first
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0: "Something on the calendar I don't like is that it's just people's birthdays." A new player's calendar is filled with the birthdays of everyone they know. The CTO's reading, open to the owner's correction: the calendar leads with the player's own appointments and deadlines and the town's dated public events (meetings, filing deadlines, elections, holidays), and shows birthdays only for the household and close family. Every entry is read from an engine's dated record.

**Rules.** This is a game, not a spreadsheet: the calendar shows what a person keeps on theirs, and the owner named this by hand. An effect is a read, not a record: each entry reads an engine's dated record and keeps no copy. The lane owns src/bench (play-first LAW).

**Done when.** In a played world in a drawn place (named with seed), the calendar's first month shows the player's appointments and the town's public events from their record ids, and birthdays only of household members and close kin; screenshots at 1440x900 before and after. Each kind of entry has its own color with a key, and the player can hide any kind and show it again; the browser check toggles one.

**Time box.** 3 hours.

**You will see.** Your calendar shows your own appointments and the town's meetings, deadlines and elections, with birthdays only for your family.

**Screenshot.** The first month's calendar before and after, from a drawn place.

**Files.** src/bench/play.mjs, src/bench/calendar.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.

Owner's answer, Nov 1 23:30: "Sure... just make them color code those things. Like town meetings and stuff. And be able to hide them if you want." The reading in What is confirmed; add a color per kind of entry and a control to hide a kind.
