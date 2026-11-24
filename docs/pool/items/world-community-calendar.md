---
id: world-community-calendar
title: "Towns have community events: each town's own real festival from basic research and a few general events a year, which the paper reports and a candidate can campaign at"
area: world
lead: lives
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on: world-community-calendar-part-1-research-event-table, world-community-calendar-part-2-event-records-on-scheduler, world-community-calendar-part-3-attendance-by-recorded-causes, world-community-calendar-part-4-paper-and-journal-read-them
after: core-every-life-simulated
model: sonnet
effort: low
root: design-life-record
source: owner, Nov 1 ("there needs to be real ones with some good fluff or else it will get old")
checked: fable 2026-11-10
---

**What.** A played town has no community events at all: no festival of its own, no Fourth of July parade, no county fair, no homecoming game, so the paper has nothing of ordinary town life to tell and a candidate has no crowd to walk into. The owner asked for this on Nov 1, 2026 ("there needs to be real ones with some good fluff or else it will get old") and set its size on Nov 10: each town gets its own real festivals from basic research, like a town's Ham Days, plus a few general events a year. Each event is one dated record. The paper reports it and a candidate can campaign at it. Nobody's attendance is decided person by person. Seen: the paper's stories of the town's own festival, the parade and homecoming, and a campaign day where the player can speak at one.

**Cause.** Design: docs/design/life-record.md and the owner's Nov 1, 2026 question ("there needs to be real ones with some good fluff or else it will get old"), in the Notes; nothing like it exists on main (searched the pool for festival, fair, parade, homecoming and community: no twin).

**Fix.** Build it in three parts, in order: world-community-calendar-part-1-research-event-table (a sourced table of a few general events by place type and size, and of named real festivals by town from one research pass), world-community-calendar-part-2-event-records-on-scheduler (dated event records on the existing calendar of dated entries, src/core2/module-calendar.ts) and world-community-calendar-part-4-paper-and-journal-read-them (the paper reports them, and `campaignDayChoices` in src/core2/campaign-day.ts offers one as a venue). Part 3, attendance person by person, was dropped on Nov 10.

**Time box.** About 9 hours in all, across the three parts; each part carries its own time box.

**Rules.** This is a game, not a spreadsheet: the events are color the player reads and a place to campaign, never a system of who went. Simulate it, don't ask: the general events and their seasons come from research by place type, and a town's own festival from one research pass, never hand-placed in code. One rule, all 56 places: no town is named in logic; a festival is a data row. One engine per mechanic: the existing calendar of dated entries, never a second scheduler. An effect is a read: an event the paper and the campaign do not read is a placeholder.

**Done when.** A second session (not the builder) plays a one-year world in three drawn places (named with seeds) in the running game and sees, in each place, dated community-event records by record id, at least two of them reported in the paper, and one offered as a place to campaign on its date. In a drawn place whose town has a researched festival, the paper names it. The speed bar holds: a year within 20 percent of base. This item is done when its three parts are.

**Waits on.** The three parts: world-community-calendar-part-1-research-event-table, world-community-calendar-part-2-event-records-on-scheduler, world-community-calendar-part-4-paper-and-journal-read-them.

**Files.** src/core2/modules/community-events.ts (new), src/core2/data/world/community-events.json (new), src/core2/module-calendar.ts, src/core2/campaign-day.ts, src/core2/modules/news.ts, src/director/

**Notes.** Filed by the CTO, Nov 1 18:00, on the owner's question. Words words the stories (`words-paper-and-journal-everyday-life`). Searched the pool for festival, fair, parade, homecoming and community: no twin.

**Notes (Fable B, Nov 10, the owner's answer).** Owner, Nov 10, 2026, about 7:16 p.m.: "I've ruled on these community events. I've talked about ham days once, you know, just doing some basic research. But there can also be some general events as well." The size he picked is the small one: each town's own real festivals from one research pass, a few general events a year, the paper reports them and a candidate can campaign at one. A system that decides who attends, person by person, is not part of it.
