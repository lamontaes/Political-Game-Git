---
id: world-community-calendar-part-1-research-event-table
title: "Research the year of community events by place type and size, as a sourced table"
area: world
kind: feature
priority: 2
size: M
status: claimed
standard: 2
claimed-by: claude/pool-world-community-calendar-part-1-research-event-table
pr: #8428
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: split from world-community-calendar in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:20:49.146Z
branch: claude/pool-world-community-calendar-part-1-research-event-table
---

**What.** A played town has no community events at all: no county fair, Fourth of July parade, harvest or heritage festival, homecoming game, school play, church supper or club meeting. Before any engine work, build the table the rest of the calendar reads: for each kind of place and size, which annual community events happen, in which season or on which date rule, and how large they are. Every row is tagged SOURCED with a citation or ESTIMATED with its source and spread, and the table must resolve every one of the 56 places to a place type so no town is named in logic.

**Cause.** Design: docs/design/life-record.md, and the owner's Nov 1, 2026 question that started this item ("there needs to be real ones with some good fluff or else it will get old").

**Fix.** Write the table as data (src/core2/data/world/community-events.json, new) from fetched sources, with a place-type resolver and a test that every one of the 56 places resolves to a type holding events.

**Time box.** 6 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Simulate it, don't ask: the events and their seasons come from research by place type, calibrated and never hand-placed per town. One rule, all 56 places: no town is named in logic. Every number lives in a parameter table tagged SOURCED or ESTIMATED. Research before building: real data fills the table and decides no outcome by itself.

**Done when.** A second session (not the builder) opens the table, draws three places of different types and sizes from the 56 (names and seeds in the PR body), and sees each place resolve to a type with dated or season-ruled events, every row tagged SOURCED with a citation or ESTIMATED with source and spread; a test in src/core2 fails when any of the 56 places resolves to no events.

**Waits on.** Nothing.

**Files.** src/core2/data/world/community-events.json (new), src/core2/community-events-table.ts (new), src/core2/community-events-table.test.ts (new)

**Notes.** Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:20 UTC) on branch claude/pool-world-community-calendar-part-1-research-event-table.
