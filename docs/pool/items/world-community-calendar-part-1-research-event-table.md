---
id: world-community-calendar-part-1-research-event-table
title: "Research a few general community events by place type and size, and each town's own real festival, as a sourced table"
area: world
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: split from world-community-calendar in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A played town has no community events at all: no county fair, Fourth of July parade, harvest or heritage festival, homecoming game, school play, church supper or club meeting. Before any engine work, build the table the rest of the calendar reads: for each kind of place and size, which annual community events happen, in which season or on which date rule, and how large they are. Every row is tagged SOURCED with a citation or ESTIMATED with its source and spread, and the table must resolve every one of the 56 places to a place type so no town is named in logic. Feeds: world-community-calendar

**Cause.** Design: docs/design/life-record.md, and the owner's Nov 1, 2026 question that started this item ("there needs to be real ones with some good fluff or else it will get old").

**Fix.** Write the table as data (src/core2/data/world/community-events.json, new) from fetched sources, in two sections. First, a few general events a year by place type and size (a Fourth of July parade, a county fair at a county seat, homecoming where there is a high school), with a place-type resolver and a test that every one of the 56 places resolves to a type holding events. Second, named real festivals by town from one research pass (a town's own Ham Days), each row with its town, its name, its month and its source; a town with no row has the general events only. Keep it to one pass: do not try to cover every town.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Simulate it, don't ask: the events and their seasons come from research by place type, calibrated and never hand-placed per town. One rule, all 56 places: no town is named in logic. Every number lives in a parameter table tagged SOURCED or ESTIMATED. Research before building: real data fills the table and decides no outcome by itself.

**Done when.** A second session (not the builder) opens the table, draws three places of different types and sizes from the 56 (names and seeds in the PR body), and sees each place resolve to a type with dated or season-ruled general events, every row tagged SOURCED with a citation or ESTIMATED with source and spread. It finds at least one named festival row for a real town in each of ten different states, each with a fetched source. A test in src/core2 fails when any of the 56 places resolves to no events.

**Waits on.** Nothing.

**Files.** src/core2/data/world/community-events.json (new), src/core2/community-events-table.ts (new), src/core2/community-events-table.test.ts (new)

**Notes (Fable B, Nov 10, the owner's answer).** Owner, Nov 10, 2026, about 7:16 p.m.: "I've ruled on these community events. I've talked about ham days once, you know, just doing some basic research. But there can also be some general events as well." The size he picked is the small one: each town's own real festivals from one research pass, a few general events a year, the paper reports them and a candidate can campaign at one. A system that decides who attends, person by person, is not part of it.
